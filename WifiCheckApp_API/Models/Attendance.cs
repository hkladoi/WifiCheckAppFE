using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class Attendance
{
    public int AttendanceId { get; set; }

    public int EmployeeId { get; set; }

    public DateOnly WorkDate { get; set; }

    public string? Notes { get; set; }

    public int? SessionId { get; set; }

    public DateTime? CheckInTime { get; set; }

    public DateTime? CheckOutTime { get; set; }

    public int? WiFiId { get; set; }

    public int? GpsId { get; set; }

    public string? CheckInStatus { get; set; }

    public string? CheckOutStatus { get; set; }

    public int? LateMinutes { get; set; }

    public int? EarlyCheckOutMinutes { get; set; }

    public string? LeaveType { get; set; }

    public string? Status { get; set; }

    public virtual ICollection<AttendanceHistory> AttendanceHistories { get; set; } = new List<AttendanceHistory>();

    public virtual Employee Employee { get; set; } = null!;

    public virtual GpsLocation? Gps { get; set; }

    public virtual AttendanceSession? Session { get; set; }

    public virtual WiFiLocation? WiFi { get; set; }
}
