namespace WifiCheckApp_API.ViewModels
{
    public class DailyModel
    {
        public string Date { get; set; } // Format: "yyyy-MM-dd"    
        public string DayOfWeek { get; set; } // e.g., "Monday", "Tuesday", etc.
        public bool IsWeekend { get; set; } // True if the day is Saturday or Sunday
        public bool IsHoliday { get; set; } // True if the day is a public holiday
        public string HolidayType { get; set; } // e.g., "Public Holiday", "Company Holiday", "Special Leave", etc.
        public string? MorningCheckIn { get; set; } // Format: "HH:mm" or null if not checked in
        public string? MorningCheckOut { get; set; } // Format: "HH:mm" or null if not checked out
        public string? AfternoonCheckIn { get; set; } // Format: "HH:mm" or null if not checked in
        public string? AfternoonCheckOut { get; set; } // Format: "HH:mm" or null if not checked out
        public double WorkingDay { get; set; } // 1.0 for full day, 0.5 for half day, etc.
        public int LateMinutes { get; set; } // Number of minutes late, 0 if on time
        public int EarlyLeaveMinutes { get; set; } // Number of minutes left early, 0 if not applicable
        public string Status { get; set; } // "OnTime", "Late", "EarlyLeave", "Absent", "Weekend", etc.
        public string? Note { get; set; } // Optional note for the day, e.g., "Sick Leave", "Vacation", etc.

        public string? LeaveType { get; set; } // Type of leave if applicable, e.g., "Sick Leave", "Annual Leave", etc.
        public string? LeaveStatus { get; set; } // Reason for leave if applicable, e.g., "Medical Appointment", "Family Emergency", etc.
    }
}
