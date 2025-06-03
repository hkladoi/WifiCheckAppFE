namespace WifiCheckApp_API.ViewModels
{
    public class SummaryModel
    {
        public MonthlyModel Monthly { get; set; } = new MonthlyModel();
        public List<DailyModel> Daily { get; set; } = new List<DailyModel>();
    }
}
