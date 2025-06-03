using System.ComponentModel.DataAnnotations;

namespace WifiCheckApp_API.ViewModels
{
    public class Checkout_model
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Email format is invalid.")]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "Device MAC is required.")]
        public string DeviceMac { get; set; } = null!;

        [Required(ErrorMessage = "Checkout time is required.")]
        public DateTime? Checkout { get; set; }

        [Required]
        public string? Notes { get; set; }
    }
}
