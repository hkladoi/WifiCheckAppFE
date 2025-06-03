using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class AttendanceHistory
{
    public int HistoryId { get; set; }

    public int? AttendanceId { get; set; }

    public string? ActionType { get; set; }

    public int? PerformedBy { get; set; }

    public DateTime? PerformedAt { get; set; }

    public string? OldValue { get; set; }

    public string? NewValue { get; set; }

    public virtual Attendance? Attendance { get; set; }

    public virtual User? PerformedByNavigation { get; set; }
}
