namespace WifiCheckApp_API.ViewModels
{
    public class Attendance_update_model
    {
        public DateTime Date { get; set; }
        public DateTime? MorningCheckIn { get; set; }
        public DateTime? MorningCheckOut { get; set; }
        public DateTime? AfternoonCheckIn { get; set; }
        public DateTime? AfternoonCheckOut { get; set; }
    }
}
