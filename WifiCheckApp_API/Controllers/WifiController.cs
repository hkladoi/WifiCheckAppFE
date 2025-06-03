using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;

namespace WifiCheckApp_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WifiController : ControllerBase
    {
        private readonly TimeLapsContext _context;
        public WifiController(TimeLapsContext timeLapsContext)
        {
            _context = timeLapsContext;
        }

        [HttpGet("GetAllWifi")]
        public async Task<List<WifiModels>> GetAllWifiLocations()
        {
            var wifiLocations = await _context.WiFiLocations.Include(c => c.WiFiBssids).ToListAsync();
            var lstModels = new List<WifiModels>();
            foreach (var wifi in wifiLocations)
            {
                var models = new WifiModels
                {
                    Id = wifi.Id,
                    Ssid = wifi.Ssid,
                    WifiBssids = wifi.WiFiBssids.Select(bssid => new WifiBssidModel
                    {
                        Id = bssid.Id,
                        Bssid = bssid.Bssid,
                    }).ToList()
                };
                lstModels.Add(models);
            }
            return lstModels;
        }
    }
}
