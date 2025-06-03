namespace WifiCheckApp_API.ViewModels
{
    public class LoginResponse
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public string FullName { get; set; }
        public int? EmployeeId { get; set; }
        public int UserId { get; set; }
    }
}
