using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class WiFiLocation
{
    public int Id { get; set; }

    public string Ssid { get; set; } = null!;

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual ICollection<WiFiBssid> WiFiBssids { get; set; } = new List<WiFiBssid>();
}
