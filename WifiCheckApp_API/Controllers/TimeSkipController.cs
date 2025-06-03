using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;
using System.Collections.Generic;
using Azure.Core;

namespace WifiCheckApp_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TimeSkipController : ControllerBase
    {
        private readonly ILogger<TimeSkipController> _logger;
        private readonly TimeLapsContext _context;

        public TimeSkipController(ILogger<TimeSkipController> logger, TimeLapsContext context)
        {
            _logger = logger;
            _context = context;
        }

        [HttpPost("checkin")]
        public async Task<IActionResult> CheckIn([FromBody] CheckinModel dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Email == dto.Email && e.IsActive == true);

            if (employee == null)
                return NotFound($"Không tìm thấy nhân viên với email {dto.Email} hoặc đã bị vô hiệu hóa.");

            var today = DateOnly.FromDateTime(dto.CheckIn);

            // Tự động xác định session theo giờ
            int sessionId;
            if (dto.TypeCheck == 1)
                sessionId = 1; // Sáng
            else
                sessionId = 2; // Chiều

            // Kiểm tra xem đã check-in cho session này trong ngày hưa chưa
            var existingCheckin = await _context.Attendances
                .FirstOrDefaultAsync(a => a.EmployeeId == employee.EmployeeId
                                        && a.WorkDate == today
                                        && a.SessionId == sessionId
                                        && a.CheckInTime != null);

            if (existingCheckin != null)
            {
                return BadRequest($"Nhân viên đã check-in cho ca {(sessionId == 1 ? "sáng" : "chiều")} hôm nay \nThời gian: {existingCheckin.CheckInTime:HH:mm:ss}");
            }

            var attendance = new Attendance
            {
                EmployeeId = employee.EmployeeId,
                WorkDate = today,
                SessionId = sessionId,
                CheckInTime = dto.CheckIn,
                Notes = dto.Notes,
                WiFiId = dto.WifiId,
                GpsId = dto.GpsId,
                CheckInStatus = dto.CheckInStatus,
                LateMinutes = dto.LateMinute,
            };

            _context.Attendances.Add(attendance);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Check-in thành công.",
                ca = sessionId == 1 ? "Sáng" : "Chiều",
                checkInTime = dto.CheckIn,
                attendanceId = attendance.AttendanceId
            });
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> CheckOut([FromBody] CheckOutModel dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Email == dto.Email && e.IsActive == true);

            if (employee == null)
                return NotFound($"Employee with email {dto.Email} not found or inactive.");

            var today = DateOnly.FromDateTime(DateTime.Now);

            int sessionId;
            if (dto.TypeCheck == 1)
                sessionId = 1; // Sáng
            else
                sessionId = 2; // Chiều

            // Kiểm tra xem đã có bản ghi check-in cho ngày hôm nay và session này chưa
            var existingAttendance = await _context.Attendances
                .FirstOrDefaultAsync(a => a.EmployeeId == employee.EmployeeId
                                        && a.WorkDate == today
                                        && a.SessionId == sessionId);

            if (existingAttendance == null)
            {
                return BadRequest($"Nhân viên chưa check-in cho ca {(sessionId == 1 ? "sáng" : "chiều")} hôm nay.\nVui lòng check-in trước khi check-out.");
            }

            // Update bản ghi hiện có với thông tin check-out
            existingAttendance.CheckOutTime = dto.CheckOut;
            existingAttendance.Notes = dto.Notes;
            existingAttendance.WiFiId = dto.WifiId;
            existingAttendance.GpsId = dto.GpsId;
            existingAttendance.CheckOutStatus = dto.checkOutStatus;
            existingAttendance.EarlyCheckOutMinutes = dto.EarlyCheckOutMinutes;

            _context.Attendances.Update(existingAttendance);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Check-out thành công.",
                attendanceId = existingAttendance.AttendanceId,
                checkInTime = existingAttendance.CheckInTime,
                checkOutTime = existingAttendance.CheckOutTime
            });
        }

        [HttpGet("attendance/monthly")]
        public async Task<IActionResult> GetMonthlyAttendance(int employeeId, int month, int year)
        {
            var totalDays = DateTime.DaysInMonth(year, month);
            var startDate = new DateOnly(year, month, 1);
            var endDate = new DateOnly(year, month, totalDays);
            var today = DateOnly.FromDateTime(DateTime.Now);

            // Lấy toàn bộ dữ liệu chấm công trong tháng
            var attendances = await _context.Attendances
                .Where(a => a.EmployeeId == employeeId && a.WorkDate >= startDate && a.WorkDate <= endDate)
                .ToListAsync();

            var result = new List<Daily_attendance_model>();

            for (int day = 1; day <= totalDays; day++)
            {
                var date = new DateOnly(year, month, day);

                if (date > today)
                    continue;

                var dayOfWeek = date.DayOfWeek;
                int weekOfMonth = ((day - 1) / 7) + 1;

                bool isSunday = dayOfWeek == DayOfWeek.Sunday;
                bool isSpecialSaturday = dayOfWeek == DayOfWeek.Saturday && (weekOfMonth == 1 || weekOfMonth == 3);

                if (isSunday || isSpecialSaturday)
                {
                    result.Add(new Daily_attendance_model
                    {
                        Day = day,
                        MorningCheckIn = "",
                        MorningCheckOut = "",
                        AfternoonCheckIn = "",
                        AfternoonCheckOut = ""
                    });
                    continue;
                }

                var morning = attendances.FirstOrDefault(a => a.WorkDate == date && a.SessionId == 1);
                var afternoon = attendances.FirstOrDefault(a => a.WorkDate == date && a.SessionId == 2);

                var dto = new Daily_attendance_model
                {
                    Day = day,
                    MorningCheckIn = morning?.CheckInTime?.ToString("HH:mm") ?? "Vắng",
                    MorningCheckOut = morning?.CheckOutTime?.ToString("HH:mm") ?? "Vắng",
                    AfternoonCheckIn = afternoon?.CheckInTime?.ToString("HH:mm") ?? "Vắng",
                    AfternoonCheckOut = afternoon?.CheckOutTime?.ToString("HH:mm") ?? "Vắng"
                };

                result.Add(dto);
            }

            return Ok(result);
        }


        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest("Email is required.");

            var exists = await _context.Employees
                .AnyAsync(e => e.Email == email && e.IsActive == true);

            if (!exists)
                return NotFound("Email chưa được đăng ký trong hệ thống.");

            return Ok("Email hợp lệ.");
        }

        [HttpGet("attendances/summary-employee")]
        public async Task<IActionResult> GetSummaryEmployee(int employeeId, int month, int year)
        {
            var startDate = new DateOnly(year, month, 1);
            var endDate = new DateOnly(year, month, DateTime.DaysInMonth(year, month));

            var attendances = await _context.Attendances
                .Where(a => a.EmployeeId == employeeId && a.WorkDate >= startDate && a.WorkDate <= endDate)
                .OrderBy(a => a.WorkDate)
                .ThenBy(a => a.SessionId)
                .ToListAsync();

            var attendanceDict = attendances
                .GroupBy(a => a.WorkDate)
                .ToDictionary(g => g.Key, g => g.ToList());

            return Ok(CalculateAttendanceSummary(startDate, endDate, attendanceDict));
        }

        string GetLeaveStatus(Attendance? morning, Attendance? afternoon)
        {
            // Kiểm tra nghỉ phép có lương đã được duyệt
            bool hasPaidLeave = (morning?.LeaveType == "Paid" && morning?.Status == "Approve") ||
                               (afternoon?.LeaveType == "Paid" && afternoon?.Status == "Approve");

            if (hasPaidLeave) return "paid";

            // Kiểm tra nghỉ phép không lương hoặc nghỉ phép bị từ chối
            bool hasUnpaidOrRejectedLeave = (morning?.LeaveType == "Unpaid") ||
                                           (afternoon?.LeaveType == "Unpaid") ||
                                           (morning?.LeaveType == "Paid" && morning?.Status == "Reject") ||
                                           (afternoon?.LeaveType == "Paid" && afternoon?.Status == "Reject");

            if (hasUnpaidOrRejectedLeave) return "unpaid";

            return null; // Không có nghỉ phép
        }

        private bool IsWorkingDay(DateOnly date)
        {
            // Loại trừ chủ nhật
            if (date.DayOfWeek == DayOfWeek.Sunday)
                return false;

            // Loại trừ thứ 7 tuần 1 và 3
            if (date.DayOfWeek == DayOfWeek.Saturday)
            {
                // Tính tuần thứ mấy trong tháng
                int dayOfMonth = date.Day;
                int weekOfMonth = ((dayOfMonth - 1) / 7) + 1;

                // Loại trừ thứ 7 tuần 1 và 3
                if (weekOfMonth == 1 || weekOfMonth == 3)
                    return false;
            }

            return true;
        }

        private SummaryModel CalculateAttendanceSummary(DateOnly startDate, DateOnly endDate, Dictionary<DateOnly, List<Attendance>> attendanceDict)
        {
            double totalWorkingDays = 0;
            int totalLateDays = 0, totalLateMinutes = 0, totalEarlyLeaveDays = 0, totalEarlyLeaveMinutes = 0, standardWorkingDays = 0;
            int totalDaysOff = 0, totalDaysOffWithoutReason = 0, totalDaysOffWithReason = 0;
            var dailyDetails = new List<DailyModel>();

            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                // Chỉ tính ngày làm việc chuẩn cho những ngày không phải cuối tuần loại trừ
                bool isWorkingDay = IsWorkingDay(date);
                if (isWorkingDay)
                {
                    standardWorkingDays++;
                }

                var dayAttendances = attendanceDict.GetValueOrDefault(date, new List<Attendance>());
                var morning = dayAttendances.FirstOrDefault(a => a.SessionId == 1);
                var afternoon = dayAttendances.FirstOrDefault(a => a.SessionId == 2);

                var leaveStatus = GetLeaveStatus(morning, afternoon);
                var dailyModel = CreateDailyModel(date, morning, afternoon, leaveStatus, isWorkingDay);

                // Cập nhật tổng kết nghỉ phép (chỉ để thống kê cho những ngày làm việc)
                if (isWorkingDay)
                {
                    if (!string.IsNullOrEmpty(leaveStatus))
                    {
                        totalDaysOff++;
                        if (leaveStatus == "paid")
                            totalDaysOffWithReason++;
                        else
                            totalDaysOffWithoutReason++;
                    }
                    else if (dailyModel.Status == "absent")
                    {
                        totalDaysOff++;
                        totalDaysOffWithoutReason++;
                    }
                }

                // Cập nhật tổng kết
                totalWorkingDays += dailyModel.WorkingDay;
                if (dailyModel.LateMinutes > 0)
                {
                    totalLateDays++;
                    totalLateMinutes += dailyModel.LateMinutes;
                }
                if (dailyModel.EarlyLeaveMinutes > 0)
                {
                    totalEarlyLeaveDays++;
                    totalEarlyLeaveMinutes += dailyModel.EarlyLeaveMinutes;
                }

                dailyDetails.Add(dailyModel);
            }

            return new SummaryModel
            {
                Monthly = new MonthlyModel
                {
                    WorkingDays = Math.Round(totalWorkingDays, 2),
                    StandardWorkingDays = standardWorkingDays,
                    AttendanceRate = standardWorkingDays > 0 ? Math.Round((totalWorkingDays / standardWorkingDays) * 100, 2) : 0,
                    LateDaysCount = totalLateDays,
                    LateMinutes = totalLateMinutes,
                    EarlyLeaveDaysCount = totalEarlyLeaveDays,
                    EarlyCheckOutMinutes = totalEarlyLeaveMinutes,
                    TotalDaysInMonth = DateTime.DaysInMonth(startDate.Year, startDate.Month),
                    TotalDaysOff = totalDaysOff,
                    TotalDaysOffWithoutReason = totalDaysOffWithoutReason,
                    TotalDaysOffWithReason = totalDaysOffWithReason
                },
                Daily = dailyDetails
            };
        }

        private DailyModel CreateDailyModel(DateOnly date, Attendance? morning, Attendance? afternoon, string leaveStatus, bool isWorkingDay)
        {
            var dailyModel = new DailyModel
            {
                Date = date.ToString("yyyy-MM-dd"),
                DayOfWeek = date.DayOfWeek.ToString(),
                IsHoliday = !isWorkingDay, // Đánh dấu những ngày không làm việc là holiday
                MorningCheckIn = morning?.CheckInTime?.ToString("HH:mm"),
                MorningCheckOut = morning?.CheckOutTime?.ToString("HH:mm"),
                AfternoonCheckIn = afternoon?.CheckInTime?.ToString("HH:mm"),
                AfternoonCheckOut = afternoon?.CheckOutTime?.ToString("HH:mm"),
                LeaveStatus = !string.IsNullOrEmpty(leaveStatus) ? (morning?.Status ?? afternoon?.Status) : null
            };

            // Luôn tính công dựa trên log chấm công, bỏ qua LeaveType
            var (workingDay, lateMinutes, earlyLeaveMinutes) = CalculateDailyWork(morning, afternoon);

            // Đối với những ngày không phải ngày làm việc, không tính công và không tính vắng mặt
            if (!isWorkingDay)
            {
                dailyModel.WorkingDay = 0;
                dailyModel.LateMinutes = 0;
                dailyModel.EarlyLeaveMinutes = 0;
            }
            else
            {
                dailyModel.WorkingDay = Math.Round(workingDay, 2);
                dailyModel.LateMinutes = lateMinutes;
                dailyModel.EarlyLeaveMinutes = earlyLeaveMinutes;

                // Status ưu tiên theo leave status nếu có (để hiển thị), nhưng không ảnh hưởng ngày công
                if (!string.IsNullOrEmpty(leaveStatus))
                {
                    dailyModel.Status = leaveStatus;
                }
                else
                {
                    dailyModel.Status = workingDay == 0 ? "absent" :
                                       workingDay == 1.0 ? "ontime" :
                                       workingDay == 0.5 ? "halfday" : "ontime";
                }
            }

            return dailyModel;
        }

        private (double workingDay, int lateMinutes, int earlyLeaveMinutes) CalculateDailyWork(Attendance? morning, Attendance? afternoon)
        {
            double workingDay = 0;
            int lateMinutes = 0, earlyLeaveMinutes = 0;

            // Tính session buổi sáng
            if (morning?.CheckInTime != null || morning?.CheckOutTime != null)
            {
                // Có log chấm công buổi sáng
                workingDay += 0.5;

                // Tính late cho buổi sáng (nếu cần)
                if (morning?.CheckInTime != null)
                {
                    var checkIn = morning.CheckInTime.Value.TimeOfDay;
                    var expectedStart = new TimeSpan(8, 0, 0);
                    if (checkIn > expectedStart)
                    {
                        lateMinutes = (int)(checkIn - expectedStart).TotalMinutes;
                    }
                }
            }

            // Tính session buổi chiều
            if (afternoon?.CheckInTime != null || afternoon?.CheckOutTime != null)
            {
                // Có log chấm công buổi chiều
                workingDay += 0.5;

                // Tính early leave cho buổi chiều (nếu cần)
                if (afternoon?.CheckOutTime != null)
                {
                    var checkOut = afternoon.CheckOutTime.Value.TimeOfDay;
                    var expectedEnd = new TimeSpan(17, 30, 0);
                    if (checkOut < expectedEnd)
                    {
                        earlyLeaveMinutes = (int)(expectedEnd - checkOut).TotalMinutes;
                    }
                }
            }

            return (workingDay, lateMinutes, earlyLeaveMinutes);
        }

        private DateTime GetDateTimeLocal(DateTime dateTime)
        {
            var vnTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            return TimeZoneInfo.ConvertTimeFromUtc(dateTime, vnTimeZone);
        }

        [HttpGet("summary")]
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

                    TotalPaidLeaves = e.Attendances.Count(a =>
                        a.WorkDate >= DateOnly.FromDateTime(startDate) &&
                        a.WorkDate < DateOnly.FromDateTime(endDate) &&
                        a.LeaveType == "Paid" &&
                        a.Status == "Approve"
                    ),

                    TotalUnpaidLeaves = e.Attendances.Count(a =>
                        a.WorkDate >= DateOnly.FromDateTime(startDate) &&
                        a.WorkDate < DateOnly.FromDateTime(endDate) &&
                        a.LeaveType == "Unpaid" &&
                        a.Status == "Approve"
                    ),

                    TotalPendingLeaves = e.Attendances.Count(a =>
                        a.WorkDate >= DateOnly.FromDateTime(startDate) &&
                        a.WorkDate < DateOnly.FromDateTime(endDate) &&
                        (a.LeaveType == "Paid" || a.LeaveType == "Unpaid") &&
                        a.Status == "Confirm"
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
        public IActionResult GetLeaveTypes()
        {
            var leaveTypes = _context.Attendances
                .Where(a => !string.IsNullOrEmpty(a.LeaveType))
                .Select(a => a.LeaveType)
                .Distinct()
                .ToList();

            var result = leaveTypes.Select(type => new
            {
                Value = type,
                Text = type == "Paid" ? "Nghỉ phép (có lương)" :
                       type == "Unpaid" ? "Nghỉ không phép" :
                       type
            }).ToList();

            // Nếu muốn hiển thị thêm trên UI (ví dụ cho dropdown lọc trạng thái), có thể thêm:
            result.Add(new
            {
                Value = "Pending",
                Text = "Đơn nghỉ đang chờ duyệt"
            });

            return Ok(result);
        }


        [HttpPost("convert-unpaid")]
        public async Task<IActionResult> ConvertUnpaid([FromBody] Convert_request_model request)
        {
            if (request.EmployeeIds == null || !request.EmployeeIds.Any())
                return BadRequest("Danh sách nhân viên không hợp lệ");

            if (string.IsNullOrWhiteSpace(request.Month) || !DateTime.TryParse($"{request.Month}-01", out var monthStart))
                return BadRequest("Tháng không hợp lệ. Định dạng đúng là yyyy-MM");

            var year = monthStart.Year;
            var month = monthStart.Month;

            var attendances = await _context.Attendances
                .Where(a =>
                    request.EmployeeIds.Contains(a.EmployeeId) &&
                    a.WorkDate.Year == year &&
                    a.WorkDate.Month == month &&
                    a.Status == "Confirm") // chỉ xử lý những cái đang là Confirm
                .ToListAsync();

            foreach (var record in attendances)
            {
                var oldStatus = record.Status;
                record.Status = request.IsApproved ? "Approve" : "Reject";

            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                UpdatedCount = attendances.Count,
                Message = request.IsApproved
                    ? $"{attendances.Count} đơn đã được duyệt thành công."
                    : $"{attendances.Count} đơn đã bị từ chối."
            });
        }


        [HttpPost("submit-leave")]
        public async Task<IActionResult> SubmitLeave([FromBody] Insert_attendance_model request)
        {
            // 1. Check xem nhân viên tồn tại
            if (!await _context.Employees.AnyAsync(e => e.EmployeeId == request.EmployeeId))
                return BadRequest($"Không tìm thấy nhân viên với EmployeeId = {request.EmployeeId}");

            // 2. Map Note => LeaveType
            var leaveType = request.Notes.Equals("Leave", StringComparison.OrdinalIgnoreCase)
                            ? "Paid"
                            : "Unpaid";

            // 3. Tạo entity và lưu
            var attendance = new Attendance
            {
                EmployeeId = request.EmployeeId,
                WorkDate = DateOnly.FromDateTime(request.WorkDate),
                Notes = request.Notes,      // dùng lại Note để hiển thị "Nghỉ phép"/"Nghỉ không lương"
                LeaveType = leaveType,
                Status ="Confirm"
            };

            _context.Attendances.Add(attendance);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Trạng thái nghỉ đã được ghi nhận.",
                AttendanceId = attendance.AttendanceId
            });
        }

        [HttpGet("by-date")]
        public IActionResult GetAttendanceByDate([FromQuery] string? date)
        {
            DateTime targetDate;
            DateOnly targetDateOnly;

            if (string.IsNullOrWhiteSpace(date))
            {
                // Không truyền date → tự lấy ngày WorkDate mới nhất có trong dữ liệu
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
                if (!DateTime.TryParseExact(date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out targetDate))
                {
                    return BadRequest("Tham số 'date' không hợp lệ. Định dạng đúng: yyyy-MM-dd");
                }

                targetDateOnly = DateOnly.FromDateTime(targetDate);
            }

            var employees = _context.Employees
                .Where(e => e.IsActive == true)
                .Select(e => new {
                    e.EmployeeId,
                    e.FullName
                }).ToList();

            var attendanceRecords = _context.Attendances
                .Where(a => a.WorkDate == targetDateOnly)
                .Include(a => a.Session)
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

                    AttendanceIdMorning = morning?.AttendanceId,
                    CheckInMorning = morning?.CheckInTime?.ToString("HH:mm") ?? "",
                    CheckOutMorning = morning?.CheckOutTime?.ToString("HH:mm") ?? "",

                    AttendanceIdAfternoon = afternoon?.AttendanceId,
                    CheckInAfternoon = afternoon?.CheckInTime?.ToString("HH:mm") ?? "",
                    CheckOutAfternoon = afternoon?.CheckOutTime?.ToString("HH:mm") ?? ""
                });
            }

            return Ok(result);
        }


        [HttpPost("adjust")]
        public async Task<IActionResult> AdjustAttendance([FromBody] Save_ChangeTimeZone_model dto)
        {
            // Nếu AttendanceId được truyền: thực hiện cập nhật như cũ
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
                    history.OldValue += $"CheckIn: {oldCheckIn} | ";
                    history.NewValue += $"CheckIn: {newCheckIn} | ";
                    attendance.CheckInTime = dto.CheckInTime;
                    isChanged = true;
                }

                if (oldCheckOut != newCheckOut)
                {
                    history.OldValue += $"CheckOut: {oldCheckOut} | ";
                    history.NewValue += $"CheckOut: {newCheckOut} | ";
                    attendance.CheckOutTime = dto.CheckOutTime;
                    isChanged = true;
                }

                if (!string.IsNullOrWhiteSpace(dto.Reason))
                {
                    history.NewValue += $"Lý do: {dto.Reason}";
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

                var newAttendance = new Attendance
                {
                    EmployeeId = dto.EmployeeId.Value,
                    SessionId = dto.SessionId.Value,
                    WorkDate = dto.WorkDate,
                    CheckInTime = dto.CheckInTime,
                    CheckOutTime = dto.CheckOutTime
                };

                _context.Attendances.Add(newAttendance);
                await _context.SaveChangesAsync(); // để có AttendanceId sau khi insert

                if (!string.IsNullOrWhiteSpace(dto.Reason))
                {
                    var history = new AttendanceHistory
                    {
                        AttendanceId = newAttendance.AttendanceId,
                        ActionType = "Insert",
                        PerformedBy = dto.PerformedBy,
                        PerformedAt = DateTime.Now,
                        OldValue = "",
                        NewValue = $"CheckIn: {dto.CheckInTime?.ToString("HH:mm") ?? ""} | " +
                                   $"CheckOut: {dto.CheckOutTime?.ToString("HH:mm") ?? ""} | " +
                                   $"Lý do: {dto.Reason}"
                    };

                    _context.AttendanceHistories.Add(history);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = "Tạo mới thành công", newAttendanceId = newAttendance.AttendanceId });
            }
        }


    }
}
