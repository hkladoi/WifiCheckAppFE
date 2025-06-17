using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;

namespace WifiCheckApp_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LeaveRequestController : ControllerBase
    {
        private readonly ILogger<TimeSkipController> _logger;
        private readonly TimeLapsContext _context;
        public LeaveRequestController(ILogger<TimeSkipController> logger, TimeLapsContext context)
        {
            _logger = logger;
            _context = context;
        }

        [HttpGet("GetLeaveRequests")]
        [Authorize]
        public async Task<IActionResult> GetLeaveRequests()
        {
            try
            {
                var leaveRequests = await _context.LeaveRequests.ToListAsync();
                if (leaveRequests == null || !leaveRequests.Any())
                {
                    return NotFound("No leave requests found.");
                }

                var result = await GetLeaveRequestsAsync(leaveRequests);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching leave requests");
                return StatusCode(StatusCodes.Status500InternalServerError, "Error fetching leave requests");
            }
        }

        [HttpGet("GetLeaveRequestByEmployeeId/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetLeaveRequestByEmployeeId(int id)
        {
            try
            {
                var leaveRequests = await _context.LeaveRequests
                    .Where(lr => lr.EmployeeId == id)
                    .ToListAsync();
                if (leaveRequests == null || !leaveRequests.Any())
                    return NotFound($"No leave requests found for employee with ID {id}.");

                var result = await GetLeaveRequestsAsync(leaveRequests);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching leave requests for employee {EmployeeId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, "Error fetching leave requests");
            }
        }

        private async Task<List<LeaveRequestModel>> GetLeaveRequestsAsync(List<LeaveRequest> leaveRequests)
        {
            var result = new List<LeaveRequestModel>();
            foreach (var leaveRequest in leaveRequests)
            {
                var leaveType = await _context.LeaveTypes.FindAsync(leaveRequest.LeaveTypeId);
                var session = await _context.AttendanceSessions.FindAsync(leaveRequest.SessionId);
                var approvedByUser = leaveRequest.ProcessedBy.HasValue ?
                    await _context.Users.FindAsync(leaveRequest.ProcessedBy.Value) : null;
                result.Add(new LeaveRequestModel
                {
                    LeaveId = leaveRequest.LeaveId,
                    EmployeeId = leaveRequest.EmployeeId,
                    EmployeeName = leaveRequest.Employee?.FullName,
                    FromTime = leaveRequest.FromTime,
                    ToTime = leaveRequest.ToTime,
                    SessionId = leaveRequest.SessionId,
                    SessionName = leaveRequest.SessionId == 0 ? "Cả ngày" : session?.Name,
                    LeaveTypeId = leaveRequest.LeaveTypeId,
                    LeaveTypeName = leaveType?.LeaveTypeName,
                    Reason = leaveRequest.Reason,
                    Status = leaveRequest.Status,
                    RequestedAt = leaveRequest.RequestedAt,
                    ProcessedBy = leaveRequest.ProcessedBy,
                    ProcessedAt = leaveRequest.ProcessedAt,
                    ProcessedByName = approvedByUser?.Username
                });
            }
            return result;
        }

        [HttpPost("ApproveRequests")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveRequests([FromBody] RequestsModel requests)
        {
            if (requests.RequestIds == null || !requests.RequestIds.Any())
            {
                return BadRequest("No leave request IDs provided.");
            }
            try
            {
                var leaveRequests = await _context.LeaveRequests
                    .Where(lr => requests.RequestIds.Contains(lr.LeaveId))
                    .ToListAsync();
                if (leaveRequests == null || !leaveRequests.Any())
                {
                    return NotFound("No leave requests found for the provided IDs.");
                }
                foreach (var leaveRequest in leaveRequests)
                {
                    leaveRequest.Status = "Approved";
                    leaveRequest.ProcessedAt = DateTime.Now;
                    // Assuming the current user ID is available in the context, replace with actual user ID
                    leaveRequest.ProcessedBy = requests.ProcessedById;
                }
                _context.LeaveRequests.UpdateRange(leaveRequests);
                await _context.SaveChangesAsync();
                return Ok("Leave requests approved successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving leave requests");
                return StatusCode(StatusCodes.Status500InternalServerError, "Error approving leave requests");
            }
        }

        [HttpPost("RejectRequests")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectRequests([FromBody] RequestsModel requests)
        {
            if (requests.RequestIds == null || !requests.RequestIds.Any())
            {
                return BadRequest("No leave request IDs provided.");
            }
            try
            {
                var leaveRequests = await _context.LeaveRequests
                    .Where(lr => requests.RequestIds.Contains(lr.LeaveId))
                    .ToListAsync();
                if (leaveRequests == null || !leaveRequests.Any())
                {
                    return NotFound("No leave requests found for the provided IDs.");
                }
                foreach (var leaveRequest in leaveRequests)
                {
                    leaveRequest.Status = "Rejected";
                    leaveRequest.ProcessedAt = DateTime.Now;
                    // Assuming the current user ID is available in the context, replace with actual user ID
                    leaveRequest.ProcessedBy = requests.ProcessedById;
                }
                _context.LeaveRequests.UpdateRange(leaveRequests);
                await _context.SaveChangesAsync();
                return Ok("Leave requests rejected successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting leave requests");
                return StatusCode(StatusCodes.Status500InternalServerError, "Error rejecting leave requests");
            }
        }

        [HttpPost("submit-leave")]
        public async Task<IActionResult> SubmitLeave([FromBody] LeaveRequestModel request)
        {
            if (!await _context.Employees.AnyAsync(e => e.EmployeeId == request.EmployeeId))
                return BadRequest($"Không tìm thấy nhân viên với EmployeeId = {request.EmployeeId}");

            var leaveRequest = new LeaveRequest
            {
                EmployeeId = request.EmployeeId,
                FromTime = request.FromTime,
                ToTime = request.ToTime,
                SessionId = request.SessionId,
                LeaveTypeId = request.LeaveTypeId,
                Reason = request.Reason,
                Status = "Confirm",
                RequestedAt = DateTime.Now
            };

            _context.LeaveRequests.Add(leaveRequest);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Trạng thái nghỉ đã được ghi nhận.",
                LeaveId = leaveRequest.LeaveId
            });
        }
    }
}
