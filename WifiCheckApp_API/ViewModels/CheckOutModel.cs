using System.ComponentModel.DataAnnotations;

namespace WifiCheckApp_API.ViewModels
{
    public class CheckOutModel
    {
        [Required]
        public string Email { get; set; }

        [Required]
        public DateTime CheckOut { get; set; }

        public string? Notes { get; set; }

        public int? WifiId { get; set; }

        public int? GpsId { get; set; }

        public int? TypeCheck { get; set; }
        public string? checkOutStatus { get; set; }

        public int? EarlyCheckOutMinutes
        {
            get; set;
        }
    }
}
