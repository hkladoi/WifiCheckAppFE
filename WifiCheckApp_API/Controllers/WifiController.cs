using Microsoft.AspNetCore.Authorization;
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
        //[Authorize]
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

        [HttpPost("AddWifiLocation")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddWifiLocation([FromBody] AddWifiModel wifiModel)
        {
            try
            {

                if (wifiModel == null || string.IsNullOrEmpty(wifiModel.Ssid) || wifiModel.WifiBssids == null || !wifiModel.WifiBssids.Any())
                {
                    return BadRequest("Invalid WiFi location data.");
                }

                var wifiLocation = new WiFiLocation
                {
                    Ssid = wifiModel.Ssid,
                    WiFiBssids = wifiModel.WifiBssids.Select(b => new WiFiBssid
                    {
                        Bssid = b.Bssid
                    }).ToList()
                };

                _context.WiFiLocations.Add(wifiLocation);
                await _context.SaveChangesAsync();
                return Ok(new { StatusCode = StatusCodes.Status201Created, Message = "WiFi location added successfully." });
            }
            catch (Exception e)
            {
                return BadRequest(new { StatusCode = StatusCodes.Status500InternalServerError, Message = e.Message });
            }
        }

        [HttpDelete("DeleteWifiLocation/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteWifiLocation(int id)
        {
            try
            {
                var wifiLocation = await _context.WiFiLocations.Include(c => c.WiFiBssids).FirstOrDefaultAsync(c => c.Id == id);
                if (wifiLocation == null)
                {
                    return NotFound(new { StatusCode = StatusCodes.Status404NotFound, Message = "WiFi location not found." });
                }
                _context.WiFiLocations.Remove(wifiLocation);
                await _context.SaveChangesAsync();
                return Ok(new { StatusCode = StatusCodes.Status200OK, Message = "WiFi location deleted successfully." });
            }
            catch (Exception e)
            {
                return BadRequest(new { StatusCode = StatusCodes.Status500InternalServerError, Message = e.Message });
            }
        }

        [HttpPut("UpdateWifiLocation/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateWifiLocation(int id, [FromBody] AddWifiModel wifiModel)
        {
            try
            {
                if (wifiModel == null || string.IsNullOrEmpty(wifiModel.Ssid) || wifiModel.WifiBssids == null || !wifiModel.WifiBssids.Any())
                {
                    return BadRequest("Invalid WiFi location data.");
                }
                var wifiLocation = await _context.WiFiLocations.Include(c => c.WiFiBssids).FirstOrDefaultAsync(c => c.Id == id);
                if (wifiLocation == null)
                {
                    return NotFound(new { StatusCode = StatusCodes.Status404NotFound, Message = "WiFi location not found." });
                }
                wifiLocation.Ssid = wifiModel.Ssid;
                wifiLocation.WiFiBssids.Clear();
                foreach (var bssid in wifiModel.WifiBssids)
                {
                    wifiLocation.WiFiBssids.Add(new WiFiBssid { Bssid = bssid.Bssid });
                }
                _context.WiFiLocations.Update(wifiLocation);
                await _context.SaveChangesAsync();
                return Ok(new { StatusCode = StatusCodes.Status200OK, Message = "WiFi location updated successfully." });
            }
            catch (Exception e)
            {
                return BadRequest(new { StatusCode = StatusCodes.Status500InternalServerError, Message = e.Message });
            }
        }
    }
}
