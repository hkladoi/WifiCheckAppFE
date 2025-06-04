using WifiCheckApp_API.Models;

namespace WifiCheckApp_API.ViewModels
{
    public class AddWifiModel
    {
        public string Ssid { get; set; }
        public List<WifiBssidModel> WifiBssids { get; set; }
    }
}
