using System;
using System.Collections.Generic;

namespace WifiCheckApp_API.Models;

public partial class GpsLocation
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public double RadiusInMeters { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
}
