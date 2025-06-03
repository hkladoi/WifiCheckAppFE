namespace WifiCheckApp_API.ViewModels
{
    public class WifiModels
    {
        public int Id { get; set; }
        public string? Ssid { get; set; }
        public List<WifiBssidModel>? WifiBssids { get; set; }
    }

    public class WifiBssidModel
    {
        public int Id { get; set; }
        public string? Bssid { get; set; }
    }
}
