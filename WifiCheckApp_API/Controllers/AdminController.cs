using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;

namespace WifiCheckApp_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly TimeLapsContext _context;
        private readonly HelpersClass _helpersClass;

        public AdminController(TimeLapsContext context, HelpersClass helpersClass)
        {
            _context = context;
            _helpersClass = helpersClass;

        }

        public class UserCreateDto
        {
            public string Username { get; set; }
            public string Email { get; set; }
        }

        [HttpPost("CreateMultiUser")]
        public async Task<IActionResult> CreateMultiUser([FromBody] List<UserCreateDto> users)
        {
            if (users == null || users.Count == 0)
            {
                return BadRequest("Danh sách người dùng không được để trống.");
            }

            var emails = users.Select(u => u.Email).ToList();

            var existingUsers = await _context.Users
                .Where(u => emails.Contains(u.Employee.Email) && u.IsActive == true)
                .ToListAsync();

            if (existingUsers.Count > 0)
            {
                return BadRequest("Một hoặc nhiều email đã tồn tại trong hệ thống.");
            }

            foreach (var userDto in users)
            {
                var employee = new Employee
                {
                    FullName = userDto.Username,
                    Email = userDto.Email,
                    IsActive = true
                };

                _context.Employees.Add(employee);
                await _context.SaveChangesAsync();

                var user = new User
                {
                    Username = userDto.Username,
                    Password = _helpersClass.HashPassword("123456"),
                    RoleId = 2,
                    EmployeeId = employee.EmployeeId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
            }

            await _context.SaveChangesAsync();

            return Ok("Tạo người dùng thành công.");
        }

        [HttpPost("ResetPasswordDefault")]
        public async Task<IActionResult> ResetPasswordDefault(int userId)
        {
            if (userId <= 0)
            {
                return BadRequest("Thông tin không hợp lệ.");
            }
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId && u.IsActive == true);
            if (user == null)
            {
                return NotFound("Không tìm thấy người dùng với UserId này.");
            }

            user.Password = _helpersClass.HashPassword("123456");
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return Ok("Đặt lại mật khẩu thành công.");
        }

        [HttpGet("GetAllEmployee")]
        public async Task<IActionResult> GetAllEmployee()
        {
            try
            {
                var employeeData = await _context.Employees.Include(c => c.Users).ThenInclude(c => c.Role).ToListAsync();
                if (employeeData.Count == 0)
                {
                    return NotFound("Không tìm thấy nhân viên nào.");
                }
                var lstEmployee = new List<EmployeeModel>();
                foreach (var employee in employeeData)
                {
                    var userName = employee.Users.FirstOrDefault()?.Username ?? string.Empty;
                    var userId = employee.Users.FirstOrDefault()?.UserId ?? 0;
                    var data = new EmployeeModel()
                    {
                        UserId = userId,
                        EmployeeId = employee.EmployeeId,
                        Email = employee.Email,
                        DateOfBirth = employee.DateOfBirth,
                        Department = employee.Department,
                        FullName = employee.FullName,
                        Gender = employee.Gender,
                        HireDate = employee.HireDate,
                        IsActive = employee.IsActive,
                        Phone = employee.Phone,
                        Position = employee.Position,
                        UserName = userName,
                    };
                    lstEmployee.Add(data);
                }
                if (lstEmployee.Count == 0)
                {
                    return NotFound("Không tìm thấy nhân viên nào.");
                }
                return Ok(lstEmployee);
            }
            catch (Exception e)
            {
                return StatusCode(500, "Đã xảy ra lỗi trong quá trình lấy dữ liệu nhân viên");
            }
        }

        [HttpPut("UpdateEmployee")]
        public async Task<IActionResult> UpdateEmployee(EmployeeModel model)
        {
            try
            {
                if (model.EmployeeId <= 0)
                {
                    return BadRequest("Thông tin không hợp lệ.");
                }
                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == model.EmployeeId && e.IsActive == true);
                if (employee == null)
                {
                    return NotFound("Không tìm thấy nhân viên với EmployeeId này.");
                }

                employee.FullName = model.FullName;
                employee.Gender = model.Gender;
                employee.DateOfBirth = model.DateOfBirth;
                employee.Email = model.Email;
                employee.Phone = model.Phone;
                employee.Department = model.Department;
                employee.Position = model.Position;
                employee.HireDate = model.HireDate;
                employee.IsActive = model.IsActive;

                _context.Employees.Update(employee);
                await _context.SaveChangesAsync();
                return Ok("Cập nhật thông tin nhân viên thành công.");
            }
            catch (Exception e)
            {
                return StatusCode(500, "Đã xảy ra lỗi trong quá trình cập nhật thông tin nhân viên.");
            }
        }

        [HttpGet("monthly-summary")]
        public IActionResult GetAttendanceSummary([FromQuery] string month)
        {
            if (string.IsNullOrWhiteSpace(month) || month.Length != 7)
                return BadRequest("Tháng không hợp lệ");

            if (!DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var startDate))
                return BadRequest("Tháng không hợp lệ");

            var endDate = startDate.AddMonths(1);

            var summary = _context.Employees
                .Where(e => e.IsActive == true)
                .Select(e => new
                {
                    EmployeeId = e.EmployeeId,
                    FullName = e.FullName,

                    TotalWorkingDays = e.Attendances.Count(a =>
                        a.WorkDate >= DateOnly.FromDateTime(startDate) &&
                        a.WorkDate < DateOnly.FromDateTime(endDate) &&
                        a.CheckInTime != null && a.CheckOutTime != null
                    ),

                    TotalPaidLeaves = e.LeaveRequests.Count(lr =>
                        lr.FromTime >= startDate &&
                        lr.FromTime < endDate &&
                        lr.LeaveType.LeaveTypeName.ToLower() == "paid" &&
                        lr.Status.ToLower() == "approved"
                    ),

                    TotalUnpaidLeaves = e.LeaveRequests.Count(lr =>
                        lr.FromTime >= startDate &&
                        lr.FromTime < endDate &&
                        lr.LeaveType.LeaveTypeName.ToLower() == "unpaid" &&
                        lr.Status.ToLower() == "approved"
                    ),

                    TotalPendingLeaves = e.LeaveRequests.Count(lr =>
                        lr.FromTime >= startDate &&
                        lr.FromTime < endDate &&
                        (lr.LeaveType.LeaveTypeName.ToLower() == "paid" || lr.LeaveType.LeaveTypeName.ToLower() == "unpaid") &&
                        lr.Status.ToLower() == "pending"
                    ),

                    TotalLateSessions = e.Attendances.Count(a =>
                        a.WorkDate >= DateOnly.FromDateTime(startDate) &&
                        a.WorkDate < DateOnly.FromDateTime(endDate) &&
                        a.LateMinutes.HasValue && a.LateMinutes > 0
                    ),

                    TotalLateMinutes = e.Attendances
                        .Where(a =>
                            a.WorkDate >= DateOnly.FromDateTime(startDate) &&
                            a.WorkDate < DateOnly.FromDateTime(endDate)
                        )
                        .Sum(a => (a.LateMinutes ?? 0) + (a.EarlyCheckOutMinutes ?? 0))
                })
                .ToList();

            var result = summary.Select((x, index) => new
            {
                STT = index + 1,
                x.EmployeeId,
                x.FullName,
                x.TotalWorkingDays,
                x.TotalPaidLeaves,
                x.TotalUnpaidLeaves,
                x.TotalPendingLeaves,
                x.TotalLateSessions,
                x.TotalLateMinutes
            });

            return Ok(result);
        }

        [HttpGet("leave-types")]
        public async Task<IActionResult> GetLeaveTypes()
        {
            var leaveTypes = await _context.LeaveTypes.ToListAsync();
            if (leaveTypes == null || !leaveTypes.Any())
                return NotFound("Không tìm thấy loại nghỉ phép nào trong hệ thống.");
            var result = leaveTypes.Select(lt => new
            {
                leaveTypeId = lt.LeaveTypeId,
                leaveTypeName = lt.LeaveTypeName.ToLower() == "paid" ? "Nghỉ có phép" :
                                lt.LeaveTypeName.ToLower() == "unpaid" ? "Nghỉ không phép" :
                                lt.LeaveTypeName,
            }).ToList();
            return Ok(result);
        }

        [HttpGet("daily-summary")]
        public IActionResult GetAttendanceByDate([FromQuery] string? workDate)
        {
            DateTime targetDate;
            DateOnly targetDateOnly;

            if (string.IsNullOrWhiteSpace(workDate))
            {
                var latestWorkDate = _context.Attendances
                    .OrderByDescending(a => a.WorkDate)
                    .Select(a => a.WorkDate)
                    .FirstOrDefault();

                if (latestWorkDate == default)
                {
                    return NotFound("Không có dữ liệu chấm công nào trong hệ thống.");
                }

                targetDateOnly = latestWorkDate;
                targetDate = latestWorkDate.ToDateTime(TimeOnly.MinValue); // để dùng targetDate.ToString("yyyy-MM-dd")
            }
            else
            {
                // Logic cũ: parse date từ FE
                if (!DateTime.TryParseExact(workDate, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out targetDate))
                {
                    return BadRequest("Tham số 'date' không hợp lệ. Định dạng đúng: yyyy-MM-dd");
                }

                targetDateOnly = DateOnly.FromDateTime(targetDate);
            }

            var employees = _context.Employees
                .Where(e => e.IsActive == true)
                .Select(e => new
                {
                    e.EmployeeId,
                    e.FullName
                }).ToList();

            var attendanceRecords = _context.Attendances
                .Where(a => a.WorkDate == targetDateOnly)
                .Include(a => a.Session)
                .Include(a => a.AttendanceHistories)
                .ToList();

            var result = new List<object>();
            int stt = 1;

            foreach (var emp in employees)
            {
                var morning = attendanceRecords.FirstOrDefault(a =>
                    a.EmployeeId == emp.EmployeeId &&
                    a.SessionId == 1);

                var afternoon = attendanceRecords.FirstOrDefault(a =>
                    a.EmployeeId == emp.EmployeeId &&
                    a.SessionId == 2);

                result.Add(new
                {
                    STT = stt++,
                    EmployeeId = emp.EmployeeId,
                    EmployeeName = emp.FullName,
                    Date = targetDate.ToString("yyyy-MM-dd"),

                    // Morning session details
                    MorningSession = new
                    {
                        SessionId = 1,
                        AttendanceId = morning?.AttendanceId,
                        CheckInTime = morning?.CheckInTime?.ToString("HH:mm") ?? "",
                        CheckOutTime = morning?.CheckOutTime?.ToString("HH:mm") ?? "",
                        Notes = morning?.Notes ?? "",
                        NoteOut = morning?.NoteOut ?? "",
                        LatestHistoryNote = morning?.AttendanceHistories
                            .OrderByDescending(h => h.PerformedAt)
                            .Select(h => h.Notes)
                            .FirstOrDefault() ?? ""
                    },

                    // Afternoon session details
                    AfternoonSession = new
                    {
                        SessionId = 2,
                        AttendanceId = afternoon?.AttendanceId,
                        CheckInTime = afternoon?.CheckInTime?.ToString("HH:mm") ?? "",
                        CheckOutTime = afternoon?.CheckOutTime?.ToString("HH:mm") ?? "",
                        Notes = afternoon?.Notes ?? "",
                        NoteOut = afternoon?.NoteOut ?? "",
                        LatestHistoryNote = afternoon?.AttendanceHistories
                            .OrderByDescending(h => h.PerformedAt)
                            .Select(h => h.Notes)
                            .FirstOrDefault() ?? ""
                    }
                });
            }

            return Ok(result);
        }

        [HttpPost("ModifyAttendance")]
        public async Task<IActionResult> AdjustAttendance([FromBody] Save_ChangeTimeZone_model dto)
        {
            // Nếu AttendanceId được truyền: thực hiện cập nhật
            if (dto.AttendanceId > 0)
            {
                var attendance = await _context.Attendances.FindAsync(dto.AttendanceId);
                if (attendance == null)
                    return NotFound("Không tìm thấy chấm công");

                bool isChanged = false;
                string oldCheckIn = attendance.CheckInTime?.ToString("HH:mm") ?? "";
                string oldCheckOut = attendance.CheckOutTime?.ToString("HH:mm") ?? "";
                string? newCheckIn = dto.CheckInTime?.ToString("HH:mm") ?? "";
                string? newCheckOut = dto.CheckOutTime?.ToString("HH:mm") ?? "";

                var history = new AttendanceHistory
                {
                    AttendanceId = attendance.AttendanceId,
                    ActionType = "Update",
                    PerformedBy = dto.PerformedBy,
                    PerformedAt = DateTime.Now,
                    OldValue = "",
                    NewValue = ""
                };

                if (oldCheckIn != newCheckIn)
                {
                    history.OldValue += $"CheckIn: {oldCheckIn}";
                    history.NewValue += $"CheckIn: {newCheckIn}";
                    attendance.CheckInTime = dto.CheckInTime;
                    isChanged = true;
                }

                if (oldCheckOut != newCheckOut)
                {
                    history.OldValue += $"CheckOut: {oldCheckOut}";
                    history.NewValue += $"CheckOut: {newCheckOut}";
                    attendance.CheckOutTime = dto.CheckOutTime;
                    isChanged = true;
                }

                if (!string.IsNullOrWhiteSpace(dto.Reason))
                {
                    history.Notes = dto.Reason;
                    isChanged = true;
                }

                if (!isChanged)
                {
                    return BadRequest("Không có thay đổi nào được thực hiện.");
                }

                _context.AttendanceHistories.Add(history);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Cập nhật thành công" });
            }
            else
            {
                // Nếu không có AttendanceId: tạo mới bản ghi
                if (dto.EmployeeId == null || dto.SessionId == null || dto.WorkDate == null)
                    return BadRequest("Thiếu thông tin để tạo mới chấm công.");

                // Kiểm tra xem đã có bản ghi cho nhân viên này trong ngày và ca này chưa
                var existingAttendance = await _context.Attendances
                    .FirstOrDefaultAsync(a =>
                        a.EmployeeId == dto.EmployeeId &&
                        a.WorkDate == dto.WorkDate &&
                        a.SessionId == dto.SessionId);

                if (existingAttendance != null)
                {
                    return BadRequest("Đã tồn tại bản ghi chấm công cho nhân viên này trong ca này.");
                }

                var newAttendance = new Attendance
                {
                    EmployeeId = dto.EmployeeId.Value,
                    SessionId = dto.SessionId.Value,
                    WorkDate = dto.WorkDate,
                    CheckInTime = dto.CheckInTime,
                    CheckOutTime = dto.CheckOutTime
                };

                _context.Attendances.Add(newAttendance);
                await _context.SaveChangesAsync();

                var history = new AttendanceHistory
                {
                    AttendanceId = newAttendance.AttendanceId,
                    ActionType = "Insert",
                    PerformedBy = dto.PerformedBy,
                    PerformedAt = DateTime.Now,
                    OldValue = "",
                    NewValue = $"CheckIn: {dto.CheckInTime?.ToString("HH:mm") ?? ""} | " +
                               $"CheckOut: {dto.CheckOutTime?.ToString("HH:mm") ?? ""} | ",
                    Notes = dto.Reason
                };

                _context.AttendanceHistories.Add(history);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Tạo mới thành công", newAttendanceId = newAttendance.AttendanceId });
            }
        }
    }
}
