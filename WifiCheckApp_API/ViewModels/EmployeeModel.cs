using WifiCheckApp_API.Models;

namespace WifiCheckApp_API.ViewModels
{
    public class EmployeeModel
    {
        public int? EmployeeId { get; set; }
        public string UserName { get; set; }

        public string FullName { get; set; } = null!;

        public string? Gender { get; set; }

        public DateOnly? DateOfBirth { get; set; }

        public string? Department { get; set; }

        public string? Position { get; set; }

        public string? Phone { get; set; }

        public string? Email { get; set; }

        public DateOnly? HireDate { get; set; }

        public bool? IsActive { get; set; }

        public string? Role { get; set; }
    }
}
