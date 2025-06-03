namespace WifiCheckApp_API.ViewModels
{
    public class Month_attendance_model
    {
        public int Stt { get; set; }
        public string FullName { get; set; } = "";
        public DateTime? CheckInMorning { get; set; }
        public DateTime? CheckOutMorning { get; set; }
        public DateTime? CheckInAfternoon { get; set; }
        public DateTime? CheckOutAfternoon { get; set; }
        public string? ChangeReason { get; set; }
    }
}
