using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;

namespace WifiCheckApp_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TimeSkipController : ControllerBase
    {
        private readonly ILogger<TimeSkipController> _logger;
        private readonly TimeLapsContext _context;
        private const int MAX_TIME_DIFFERENCE_MINUTES = 1;
        private static readonly TimeZoneInfo VietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        private readonly HelpersClass _helpersClass;

        public TimeSkipController(ILogger<TimeSkipController> logger, TimeLapsContext context, HelpersClass helpersClass)
        {
            _logger = logger;
            _context = context;
            _helpersClass = helpersClass;

        }

        private (bool isValid, string message) IsTimeValid(DateTime clientTime)
        {
            // Convert client time to Vietnam timezone
            var clientTimeVN = TimeZoneInfo.ConvertTime(clientTime, VietnamTimeZone);

            // Get server time in Vietnam timezone
            var serverTimeVN = TimeZoneInfo.ConvertTime(DateTime.Now, VietnamTimeZone);

            var timeDifference = Math.Abs((clientTimeVN - serverTimeVN).TotalMinutes);

            // Log the time difference for monitoring
            _logger.LogInformation($"Time difference between client and server: {timeDifference} minutes");

            if (timeDifference > MAX_TIME_DIFFERENCE_MINUTES)
            {
                var message = "Thời gian không hợp lệ";
                return (false, message);
            }

            return (true, string.Empty);
        }

        [HttpPost("checkin")]
        [Authorize]
        public async Task<IActionResult> CheckIn([FromBody] CheckinModel dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate time difference
            var (isValid, message) = IsTimeValid(dto.CheckIn);
            if (!isValid)
            {
                return BadRequest(message);
            }

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
                NoteOut = dto.NoteOut,
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
        [Authorize]
        public async Task<IActionResult> CheckOut([FromBody] CheckOutModel dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate time difference
            var (isValid, message) = IsTimeValid(dto.CheckOut);
            if (!isValid)
            {
                return BadRequest(message);
            }

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

            var existingAttendance = await _context.Attendances
                .FirstOrDefaultAsync(a => a.EmployeeId == employee.EmployeeId
                                        && a.WorkDate == today
                                        && a.SessionId == sessionId);

            if (existingAttendance == null)
            {
                var newAttendance = new Attendance
                {
                    EmployeeId = employee.EmployeeId,
                    WorkDate = today,
                    SessionId = sessionId,
                    CheckOutTime = dto.CheckOut,
                    Notes = dto.Notes,
                    NoteOut = dto.NoteOut,
                    WiFiId = dto.WifiId,
                    GpsId = dto.GpsId,
                    CheckOutStatus = dto.checkOutStatus,
                    EarlyCheckOutMinutes = dto.EarlyCheckOutMinutes
                };
                _context.Attendances.Add(newAttendance);
                await _context.SaveChangesAsync();
                return Ok(new
                {
                    message = "Check-out thành công.",
                    attendanceId = newAttendance.AttendanceId,
                    checkInTime = newAttendance.CheckInTime,
                    checkOutTime = newAttendance.CheckOutTime
                });
            }

            // Update bản ghi hiện có với thông tin check-out
            existingAttendance.CheckOutTime = dto.CheckOut;
            existingAttendance.Notes = dto.Notes;
            existingAttendance.NoteOut = dto.NoteOut;
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

        [HttpGet("attendances/summary-employee")]
        [Authorize]
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

            return Ok(_helpersClass.CalculateAttendanceSummary(startDate, endDate, attendanceDict));
        }


    }
}
