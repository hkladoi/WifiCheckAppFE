namespace WifiCheckApp_API.ViewModels
{
    public class AttendanceUpdateModel
    {
        public DateTime Date { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string? CheckInStatus { get; set; }
        public string? CheckOutStatus { get; set; }
        public int? GpsId { get; set; }
        public int? WifiId { get; set; }
    }
}
