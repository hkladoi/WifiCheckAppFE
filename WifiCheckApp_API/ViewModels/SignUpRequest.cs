namespace WifiCheckApp_API.ViewModels
{
    public class SignUpRequest
    {
        public string? Username { get; set; }
        public string? Password { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Gender { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public string? Phone { get; set; }
        public DateOnly? HireDate { get; set; }
    }
}
