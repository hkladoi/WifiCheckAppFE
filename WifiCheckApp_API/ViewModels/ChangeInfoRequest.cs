namespace WifiCheckApp_API.ViewModels
{
    public class ChangeInfoRequest
    {
        public int EmployeeId { get; set; }

        public string FullName { get; set; } = null!;

        public string? Gender { get; set; }

        public DateOnly? DateOfBirth { get; set; }

        public string? Phone { get; set; }

        public string? Email { get; set; }
    }
}
