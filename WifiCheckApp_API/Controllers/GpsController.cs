using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;

namespace WifiCheckApp_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GpsController : ControllerBase
    {
        private readonly TimeLapsContext _context;
        public GpsController(TimeLapsContext timeLapsContext)
        {
            _context = timeLapsContext;
        }

        [HttpGet("GetAllGps")]
        public async Task<List<GpsModel>> GetAllGpsLocations()
        {
            var gpsLocations = await _context.GpsLocations.ToListAsync();
            var lstModels = new List<GpsModel>();
            foreach (var gpsLocation in gpsLocations)
            {
                var models = new GpsModel
                {
                    Id = gpsLocation.Id,
                    Name = gpsLocation.Name,
                    Latitude = gpsLocation.Latitude,
                    Longitude = gpsLocation.Longitude,
                    RadiusInMeters = gpsLocation.RadiusInMeters,
                };
                lstModels.Add(models);
            }
            return lstModels;
        }
    }
}
