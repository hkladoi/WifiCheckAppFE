using Microsoft.AspNetCore.Authorization;
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
        //[Authorize]
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

        [HttpPost("AddGpsLocation")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddGpsLocation([FromBody] GpsModel gpsModel)
        {
            try
            {
                if (gpsModel == null || string.IsNullOrEmpty(gpsModel.Name) || gpsModel.Latitude == 0 || gpsModel.Longitude == 0)
                {
                    return BadRequest("Invalid GPS location data.");
                }
                var gpsLocation = new GpsLocation
                {
                    Name = gpsModel.Name,
                    Latitude = gpsModel.Latitude,
                    Longitude = gpsModel.Longitude,
                    RadiusInMeters = gpsModel.RadiusInMeters
                };
                _context.GpsLocations.Add(gpsLocation);
                await _context.SaveChangesAsync();
                return Ok(new { message = "GPS location added successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, $"Error adding GPS location: {ex.Message}");
            }
        }

        [HttpPut("EditGpsLocation/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> EditGpsLocation(int id, [FromBody] GpsModel gpsModel)
        {
            try
            {
                if (gpsModel == null || string.IsNullOrEmpty(gpsModel.Name) || gpsModel.Latitude == 0 || gpsModel.Longitude == 0)
                {
                    return BadRequest("Invalid GPS location data.");
                }
                var existingGps = await _context.GpsLocations.FindAsync(id);
                if (existingGps == null)
                {
                    return NotFound("GPS location not found.");
                }
                existingGps.Name = gpsModel.Name;
                existingGps.Latitude = gpsModel.Latitude;
                existingGps.Longitude = gpsModel.Longitude;
                existingGps.RadiusInMeters = gpsModel.RadiusInMeters;
                _context.GpsLocations.Update(existingGps);
                await _context.SaveChangesAsync();
                return Ok(new { message = "GPS location updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, $"Error updating GPS location: {ex.Message}");
            }
        }

        [HttpDelete("DeleteGpsLocation/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteGpsLocation(int id)
        {
            try
            {
                var gpsLocation = await _context.GpsLocations.FindAsync(id);
                if (gpsLocation == null)
                {
                    return NotFound("GPS location not found.");
                }
                _context.GpsLocations.Remove(gpsLocation);
                await _context.SaveChangesAsync();
                return Ok(new { message = "GPS location deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, $"Error deleting GPS location: {ex.Message}");
            }
        }
    }
}