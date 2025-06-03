using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class Device
{
    public int DeviceId { get; set; }

    public string MacAddress { get; set; } = null!;

    public string? Description { get; set; }

    public bool? IsActive { get; set; }
}
