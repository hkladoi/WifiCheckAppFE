using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;

namespace WifiCheckApp_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly TimeLapsContext _context;

        public AdminController(TimeLapsContext context)
        {
            _context = context;
        }
        private DateTime GetDateTimeLocal(DateTime dateTime)
        {
            var vnTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            return TimeZoneInfo.ConvertTimeFromUtc(dateTime, vnTimeZone);
        }

        [HttpPut("{employeeId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateAttendance(int employeeId, [FromBody] AttendanceUpdateModel dto)
        {
            var workDate = DateOnly.FromDateTime(dto.Date);

            var attendance = await _context.Attendances
                .FirstOrDefaultAsync(a =>
                    a.EmployeeId == employeeId &&
                    a.WorkDate == workDate);

            if (attendance == null)
                return NotFound("Không tìm thấy bản ghi chấm công.");

            var changes = new List<AttendanceHistory>();
            var performedBy = int.Parse(User.FindFirst("userId")?.Value ?? "0");

            void TrackChange(string field, object? oldValue, object? newValue)
            {
                if (!Equals(oldValue, newValue))
                {
                    changes.Add(new AttendanceHistory
                    {
                        AttendanceId = attendance.AttendanceId,
                        ActionType = "Update",
                        PerformedBy = performedBy,
                        PerformedAt = GetDateTimeLocal(DateTime.Now),
                        OldValue = $"{field}: {oldValue}",
                        NewValue = $"{field}: {newValue}"
                    });
                }
            }

            // So sánh & lưu thay đổi
            TrackChange("CheckInTime", attendance.CheckInTime, dto.CheckInTime);
            TrackChange("CheckOutTime", attendance.CheckOutTime, dto.CheckOutTime);
            TrackChange("CheckInStatus", attendance.CheckInStatus, dto.CheckInStatus);
            TrackChange("CheckOutStatus", attendance.CheckOutStatus, dto.CheckOutStatus);
            TrackChange("GpsId", attendance.GpsId, dto.GpsId);
            TrackChange("WifiId", attendance.WiFiId, dto.WifiId);

            // Cập nhật giá trị
            attendance.CheckInTime = dto.CheckInTime;
            attendance.CheckOutTime = dto.CheckOutTime;
            attendance.CheckInStatus = dto.CheckInStatus;
            attendance.CheckOutStatus = dto.CheckOutStatus;
            attendance.GpsId = dto.GpsId;
            attendance.WiFiId = dto.WifiId;

            _context.AttendanceHistories.AddRange(changes);
            await _context.SaveChangesAsync();

            return Ok("Cập nhật thành công.");
        }
    }
}
