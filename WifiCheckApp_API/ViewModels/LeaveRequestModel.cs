namespace WifiCheckApp_API.ViewModels
{
    public class LeaveRequestModel
    {
        public int LeaveId { get; set; }

        public int EmployeeId { get; set; }
        public string? EmployeeName { get; set; }

        public DateTime? FromTime { get; set; }

        public DateTime? ToTime { get; set; }

        public int? SessionId { get; set; }
        public string? SessionName { get; set; }

        public int? LeaveTypeId { get; set; }
        public string? LeaveTypeName { get; set; }

        public string? Reason { get; set; }

        public string? Status { get; set; }

        public DateTime? RequestedAt { get; set; }

        public int? ProcessedBy { get; set; }

        public DateTime? ProcessedAt { get; set; }

        public string? ProcessedByName { get; set; }
    }
}
