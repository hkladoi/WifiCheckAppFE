using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class WiFiBssid
{
    public int Id { get; set; }

    public int? WiFiId { get; set; }

    public string? Bssid { get; set; }

    public virtual WiFiLocation? WiFi { get; set; }
}
