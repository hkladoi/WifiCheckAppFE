using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class Employee
{
    public int EmployeeId { get; set; }

    public string FullName { get; set; } = null!;

    public string? Gender { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public string? Department { get; set; }

    public string? Position { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public DateOnly? HireDate { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
