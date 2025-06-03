using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class User
{
    public int UserId { get; set; }

    public int? EmployeeId { get; set; }

    public string Username { get; set; } = null!;

    public string Password { get; set; } = null!;

    public int? RoleId { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<AttendanceHistory> AttendanceHistories { get; set; } = new List<AttendanceHistory>();

    public virtual Employee? Employee { get; set; }

    public virtual Role? Role { get; set; }
}
