namespace WifiCheckApp_API.ViewModels
{
    public class Convert_request_model
    {
        public List<int> EmployeeIds { get; set; } = new();
        public string Month { get; set; } = "";
        public bool IsApproved { get; set; }    
    }
}
