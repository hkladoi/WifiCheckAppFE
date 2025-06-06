using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class LeaveRequest
{
    public int LeaveId { get; set; }

    public int EmployeeId { get; set; }

    public int? SessionId { get; set; }

    public string? Reason { get; set; }

    public string? Status { get; set; }

    public DateTime? RequestedAt { get; set; }

    public int? ProcessedBy { get; set; }

    public DateTime? ProcessedAt { get; set; }

    public int? LeaveTypeId { get; set; }

    public DateTime? FromTime { get; set; }

    public DateTime? ToTime { get; set; }

    public virtual Employee Employee { get; set; } = null!;

    public virtual LeaveType? LeaveType { get; set; }

    public virtual User? ProcessedByNavigation { get; set; }

    public virtual AttendanceSession? Session { get; set; }
}
