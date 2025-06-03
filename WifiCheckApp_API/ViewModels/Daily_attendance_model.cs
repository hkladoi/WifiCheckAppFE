namespace WifiCheckApp_API.ViewModels
{
    public class Daily_attendance_model
    {
        public int Day { get; set; }
        public string MorningCheckIn { get; set; } = "Vắng";
        public string MorningCheckOut { get; set; } = "Vắng";
        public string AfternoonCheckIn { get; set; } = "Vắng";
        public string AfternoonCheckOut { get; set; } = "Vắng";
    }
}
