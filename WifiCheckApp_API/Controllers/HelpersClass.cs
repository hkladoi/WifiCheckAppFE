using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;

namespace WifiCheckApp_API.Controllers
{
    public class HelpersClass
    {
        private readonly TimeLapsContext _context;

        public HelpersClass(TimeLapsContext context)
        {
            _context = context;
        }

        public bool VerifyPassword(string plainPassword, string hashedPassword)
        {
            try
            {
                return BCrypt.Net.BCrypt.Verify(plainPassword, hashedPassword);
            }
            catch (Exception)
            {
                return false;
            }
        }

        public string HashPassword(string password)
        {
            // Generate salt and hash password with BCrypt
            // WorkFactor 12 provides good security balance between performance and security
            return BCrypt.Net.BCrypt.HashPassword(password, 12);
        }

        public string GetRoleName(string roleNameFromDb)
        {
            if (string.IsNullOrEmpty(roleNameFromDb))
                return "Employee";

            return roleNameFromDb.ToLowerInvariant() switch
            {
                "admin" => "Admin",
                "employee" => "Employee",
                _ => CultureInfo.CurrentCulture.TextInfo.ToTitleCase(roleNameFromDb.ToLowerInvariant())
            };
        }

        public DateTime GetDateTimeLocal(DateTime dateTime)
        {
            var vnTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            return TimeZoneInfo.ConvertTimeFromUtc(dateTime, vnTimeZone);
        }


        string GetLeaveStatus(Attendance? morning, Attendance? afternoon)
        {
            // Kiểm tra nghỉ phép có lương đã được duyệt
            bool hasPaidLeave = (morning?.LeaveType == "Paid" && morning?.Status == "Approve") ||
                               (afternoon?.LeaveType == "Paid" && afternoon?.Status == "Approve");

            if (hasPaidLeave) return "paid";

            // Kiểm tra nghỉ phép không lương hoặc nghỉ phép bị từ chối
            bool hasUnpaidOrRejectedLeave = (morning?.LeaveType == "Unpaid") ||
                                           (afternoon?.LeaveType == "Unpaid") ||
                                           (morning?.LeaveType == "Paid" && morning?.Status == "Reject") ||
                                           (afternoon?.LeaveType == "Paid" && afternoon?.Status == "Reject");

            if (hasUnpaidOrRejectedLeave) return "unpaid";

            return null; // Không có nghỉ phép
        }

        private bool IsWorkingDay(DateOnly date)
        {
            // Loại trừ chủ nhật
            if (date.DayOfWeek == DayOfWeek.Sunday)
                return false;

            // Loại trừ thứ 7 tuần 1 và 3
            if (date.DayOfWeek == DayOfWeek.Saturday)
            {
                // Tính tuần thứ mấy trong tháng
                int dayOfMonth = date.Day;
                int weekOfMonth = ((dayOfMonth - 1) / 7) + 1;

                // Loại trừ thứ 7 tuần 1 và 3
                if (weekOfMonth == 1 || weekOfMonth == 3)
                    return false;
            }

            return true;
        }

        public SummaryModel CalculateAttendanceSummary(DateOnly startDate, DateOnly endDate, Dictionary<DateOnly, List<Attendance>> attendanceDict)
        {
            double totalWorkingDays = 0;
            int totalLateDays = 0, totalLateMinutes = 0, totalEarlyLeaveDays = 0, totalEarlyLeaveMinutes = 0, standardWorkingDays = 0;
            int totalDaysOff = 0, totalDaysOffWithoutReason = 0, totalDaysOffWithReason = 0;
            var dailyDetails = new List<DailyModel>();

            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                // Chỉ tính ngày làm việc chuẩn cho những ngày không phải cuối tuần loại trừ
                bool isWorkingDay = IsWorkingDay(date);
                if (isWorkingDay)
                {
                    standardWorkingDays++;
                }

                var dayAttendances = attendanceDict.GetValueOrDefault(date, new List<Attendance>());
                var morning = dayAttendances.FirstOrDefault(a => a.SessionId == 1);
                var afternoon = dayAttendances.FirstOrDefault(a => a.SessionId == 2);

                var leaveStatus = GetLeaveStatus(morning, afternoon);
                var dailyModel = CreateDailyModel(date, morning, afternoon, leaveStatus, isWorkingDay);

                // Cập nhật tổng kết nghỉ phép (chỉ để thống kê cho những ngày làm việc)
                if (isWorkingDay)
                {
                    if (!string.IsNullOrEmpty(leaveStatus))
                    {
                        totalDaysOff++;
                        if (leaveStatus == "paid")
                            totalDaysOffWithReason++;
                        else
                            totalDaysOffWithoutReason++;
                    }
                    else if (dailyModel.Status == "absent")
                    {
                        totalDaysOff++;
                        totalDaysOffWithoutReason++;
                    }
                }

                // Cập nhật tổng kết
                totalWorkingDays += dailyModel.WorkingDay;
                if (dailyModel.LateMinutes > 0)
                {
                    totalLateDays++;
                    totalLateMinutes += dailyModel.LateMinutes;
                }
                if (dailyModel.EarlyLeaveMinutes > 0)
                {
                    totalEarlyLeaveDays++;
                    totalEarlyLeaveMinutes += dailyModel.EarlyLeaveMinutes;
                }

                dailyDetails.Add(dailyModel);
            }

            return new SummaryModel
            {
                Monthly = new MonthlyModel
                {
                    WorkingDays = Math.Round(totalWorkingDays, 2),
                    StandardWorkingDays = standardWorkingDays,
                    AttendanceRate = standardWorkingDays > 0 ? Math.Round((totalWorkingDays / standardWorkingDays) * 100, 2) : 0,
                    LateDaysCount = totalLateDays,
                    LateMinutes = totalLateMinutes,
                    EarlyLeaveDaysCount = totalEarlyLeaveDays,
                    EarlyCheckOutMinutes = totalEarlyLeaveMinutes,
                    TotalDaysInMonth = DateTime.DaysInMonth(startDate.Year, startDate.Month),
                    TotalDaysOff = totalDaysOff,
                    TotalDaysOffWithoutReason = totalDaysOffWithoutReason,
                    TotalDaysOffWithReason = totalDaysOffWithReason
                },
                Daily = dailyDetails
            };
        }

        private DailyModel CreateDailyModel(DateOnly date, Attendance? morning, Attendance? afternoon, string leaveStatus, bool isWorkingDay)
        {
            var dailyModel = new DailyModel
            {
                Date = date.ToString("yyyy-MM-dd"),
                DayOfWeek = date.DayOfWeek.ToString(),
                IsHoliday = !isWorkingDay, // Đánh dấu những ngày không làm việc là holiday
                MorningCheckIn = morning?.CheckInTime?.ToString("HH:mm"),
                MorningCheckOut = morning?.CheckOutTime?.ToString("HH:mm"),
                AfternoonCheckIn = afternoon?.CheckInTime?.ToString("HH:mm"),
                AfternoonCheckOut = afternoon?.CheckOutTime?.ToString("HH:mm"),
                LateMinutes = morning?.LateMinutes ?? afternoon?.LateMinutes ?? 0,
                EarlyLeaveMinutes = morning?.EarlyCheckOutMinutes ?? afternoon?.EarlyCheckOutMinutes ?? 0,
                LeaveStatus = !string.IsNullOrEmpty(leaveStatus) ? (morning?.Status ?? afternoon?.Status) : null
            };

            // Luôn tính công dựa trên log chấm công, bỏ qua LeaveType
            var workingDay = CalculateDailyWork(morning, afternoon);

            // Đối với những ngày không phải ngày làm việc, không tính công và không tính vắng mặt
            if (!isWorkingDay)
            {
                dailyModel.WorkingDay = 0;
                dailyModel.LateMinutes = 0;
                dailyModel.EarlyLeaveMinutes = 0;
            }
            else
            {
                dailyModel.WorkingDay = Math.Round(workingDay, 2);

                // Status ưu tiên theo leave status nếu có (để hiển thị), nhưng không ảnh hưởng ngày công
                if (!string.IsNullOrEmpty(leaveStatus))
                {
                    dailyModel.Status = leaveStatus;
                }
                else
                {
                    dailyModel.Status = workingDay == 0 ? "absent" :
                                       workingDay == 1.0 ? "ontime" :
                                       workingDay == 0.5 ? "halfday" : "ontime";
                }
            }

            return dailyModel;
        }

        private double CalculateDailyWork(Attendance? morning, Attendance? afternoon)
        {
            double workingDay = 0;
            int lateMinutes = 0, earlyLeaveMinutes = 0;

            // Tính session buổi sáng
            if (morning?.CheckInTime != null || morning?.CheckOutTime != null || afternoon?.CheckInTime != null || afternoon?.CheckOutTime != null)
            {
                workingDay += 0.5;
            }

            return workingDay;
        }
    }
}
