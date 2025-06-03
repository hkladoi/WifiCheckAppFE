using System.ComponentModel.DataAnnotations;

namespace WifiCheckApp_API.ViewModels
{
    public class Checkin_model
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Email format is invalid.")]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "Device MAC is required.")]
        public string DeviceMac { get; set; } = null!;

        [Required(ErrorMessage = "CheckIn time is required.")]
        public DateTime CheckIn { get; set; }

        [Required]
        public string? Notes { get; set; }
    }
}
