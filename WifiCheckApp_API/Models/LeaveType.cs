using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class LeaveType
{
    public int LeaveTypeId { get; set; }

    public string? LeaveTypeName { get; set; }

    public string? Description { get; set; }
}
