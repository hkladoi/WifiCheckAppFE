namespace WifiCheckApp_API.ViewModels
{
    public class Login_model_response
    {
            public string Token { get; set; }
            public string Role { get; set; }
            public List<string> Permissions { get; set; }
    }
}
