using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class AttendanceSession
{
    public int SessionId { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
}
