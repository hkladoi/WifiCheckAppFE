using System.ComponentModel.DataAnnotations;

namespace WifiCheckApp_API.ViewModels
{
    public class CheckinModel
    {
        [Required]
        public string Email { get; set; }

        [Required]
        public DateTime CheckIn { get; set; }

        public string? Notes { get; set; }

        public int? WifiId { get; set; }

        public int? GpsId { get; set; }

        public int? TypeCheck { get; set; }

        public string? CheckInStatus { get; set; }

        public int? LateMinute { get; set; }
    }
}
