namespace WifiCheckApp_API.ViewModels
{
    public class MonthlyModel
    {
        public double WorkingDays { get; set; } // Số ngày làm việc thực tế trong tháng
        public int StandardWorkingDays { get; set; } // Số ngày làm việc tiêu chuẩn trong tháng
        public double AttendanceRate { get; set; } // Tỷ lệ % so với ngày làm việc tiêu chuẩn
        public int LateDaysCount { get; set; } // Số ngày đi muộn
        public int LateMinutes { get; set; } // Tổng phút đi muộn
        public int EarlyLeaveDaysCount { get; set; } // Số ngày về sớm
        public int EarlyCheckOutMinutes { get; set; } // Tổng phút về sớm
        public int TotalDaysInMonth { get; set; } // Tổng số ngày trong tháng
        public int TotalDaysOff { get; set; } // Tổng số ngày nghỉ phép
        public int TotalDaysOffWithoutReason { get; set; } // Tổng số ngày nghỉ không phép
        public int TotalDaysOffWithReason { get; set; } // Tổng số ngày nghỉ có lý do
    }
}
