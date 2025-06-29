﻿using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WifiCheckApp_API.Models;
using WifiCheckApp_API.ViewModels;

namespace WifiCheckApp_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthenController : ControllerBase
    {
        private readonly TimeLapsContext _context;
        private readonly IConfiguration _configuration;
        private HelpersClass _helpersClass;

        public AuthenController(TimeLapsContext context, IConfiguration configuration, HelpersClass helpersClass)
        {
            _context = context;
            _configuration = configuration;
            _helpersClass = helpersClass;
        }

        private string GenarateJwtToken(string username, string role)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var fullname = _context.Users
                .Where(u => u.Username == username)
                .Select(u => u.Employee != null ? u.Employee.FullName : "")
                .FirstOrDefault() ?? "";

            var userId = _context.Users
                .Where(u => u.Username == username)
                .Select(u => u.UserId)
                .FirstOrDefault();

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, role),
                new Claim("FullName", fullname),
                new Claim("UserId", userId.ToString())
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(Convert.ToDouble(jwtSettings["ExpireMinutes"])),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] Login_model_request request)
        {
            try
            {
                var user = await _context.Users.AsNoTracking()
                    .Include(u => u.Role)
                    .Include(u => u.Employee)
                    .FirstOrDefaultAsync(u => u.IsActive == true && u.Username == request.Username || u.Employee.Email == request.Username);

                if (user == null)
                    return Unauthorized("Tài khoản không tồn tại hoặc đã bị khóa.");

                // 2. So sánh password
                if (!_helpersClass.VerifyPassword(request.Password, user.Password))
                    return Unauthorized("Mật khẩu không đúng.");

                // 3. Lấy role name
                var roleNameFromDb = user.Role?.RoleName;

                var roleName = _helpersClass.GetRoleName(roleNameFromDb);

                // 4. Lấy full name, nếu null lấy username luôn
                var fullname = user.Employee?.FullName ?? user.Username;

                // 4. Tạo token
                var token = GenarateJwtToken(user.Username, roleName);

                //var employeeId = user.Employee?.EmployeeId ?? user.UserId;
                return Ok(new
                {
                    Token = token,
                    Username = user.Username,
                    Role = roleName,
                    FullName = fullname,
                    EmployeeId = user.Employee?.EmployeeId,
                    UserId = user.UserId,
                    Email = user.Employee?.Email ?? string.Empty
                });
            }
            catch (Exception e)
            {
                return StatusCode(500, "Đã xảy ra lỗi trong quá trình đăng nhập.");
            }
        }

        [HttpPost("loginApp")]
        public async Task<IActionResult> LoginApp([FromBody] Login_model_request request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Username và Password không được để trống.");
            }

            try
            {
                var user = await _context.Users.AsNoTracking()
                    .Include(u => u.Role)
                    .Include(u => u.Employee)
                    .FirstOrDefaultAsync(u => u.IsActive == true && u.Username == request.Username || u.Employee.Email == request.Username);

                if (user == null)
                {
                    return Unauthorized("Tài khoản không tồn tại hoặc đã bị khóa.");
                }

                if (!_helpersClass.VerifyPassword(request.Password, user.Password))
                {
                    return Unauthorized("Mật khẩu không đúng.");
                }

                // Tối ưu role mapping
                var roleName = _helpersClass.GetRoleName(user.Role?.RoleName);
                var fullName = user.Employee?.FullName ?? user.Username;

                // Generate JWT token
                var token = GenarateJwtToken(user.Username, roleName);

                // Return response
                return Ok(new LoginResponse
                {
                    Token = token,
                    Username = user.Username,
                    Email = user.Employee?.Email ?? string.Empty,
                    Role = roleName,
                    FullName = fullName,
                    EmployeeId = user.Employee?.EmployeeId,
                    UserId = user.UserId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Đã xảy ra lỗi trong quá trình đăng nhập.");
            }
        }

        [HttpGet("GetUserInfo")]
        [Authorize]
        public async Task<IActionResult> GetUserInfo(int employeeId)
        {
            if (employeeId <= 0)
            {
                return BadRequest("EmployeeId không hợp lệ.");
            }
            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.Employee)
                .FirstOrDefaultAsync(u => u.EmployeeId == employeeId && u.IsActive == true);
            if (user == null)
            {
                return NotFound("Không tìm thấy người dùng với EmployeeId này.");
            }

            var roleName = _helpersClass.GetRoleName(user.Role?.RoleName);
            return Ok(new EmployeeModel
            {
                UserId = user.UserId,
                EmployeeId = user.EmployeeId,
                Email = user.Employee?.Email,
                DateOfBirth = user.Employee?.DateOfBirth,
                Department = user.Employee?.Department,
                FullName = user.Employee?.FullName,
                UserName = user.Username,
                Gender = user.Employee?.Gender,
                HireDate = user.Employee?.HireDate,
                IsActive = user.Employee?.IsActive,
                Phone = user.Employee?.Phone,
                Position = user.Employee?.Position,
                Role = roleName
            });
        }

        [HttpPost("ChangePassword")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.OldPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Mật khẩu cũ và mật khẩu mới không được để trống.");
            }
            var user = await _context.Users.FirstOrDefaultAsync(u => u.IsActive == true && u.UserId == request.UserId);
            if (user == null)
            {
                return Unauthorized("Tài khoản không tồn tại hoặc đã bị khóa.");
            }
            // Kiểm tra mật khẩu cũ

            if (!_helpersClass.VerifyPassword(request.OldPassword, user.Password))
            {
                return Unauthorized("Mật khẩu cũ không đúng.");
            }
            // Mã hóa mật khẩu mới
            user.Password = _helpersClass.HashPassword(request.NewPassword);
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return Ok("Đổi mật khẩu thành công.");
        }

        [HttpPost("ChangeInfo")]
        [Authorize]
        public async Task<IActionResult> ChangeInfo([FromBody] ChangeInfoRequest request)
        {
            if (request == null || request.EmployeeId <= 0)
            {
                return BadRequest("Thông tin không hợp lệ.");
            }
            var Employees = await _context.Employees
                .FirstOrDefaultAsync(u => u.EmployeeId == request.EmployeeId && u.IsActive == true);
            if (Employees == null)
            {
                return NotFound("Không tìm thấy người dùng với EmployeeId này.");
            }
            // Cập nhật thông tin nhân viên
            Employees.FullName = request.FullName ?? Employees.FullName;
            Employees.Gender = request.Gender ?? Employees.Gender;
            Employees.DateOfBirth = request.DateOfBirth ?? Employees.DateOfBirth;
            Employees.Email = request.Email ?? Employees.Email;
            Employees.Phone = request.Phone ?? Employees.Phone;
            _context.Employees.Update(Employees);
            await _context.SaveChangesAsync();
            return Ok("Cập nhật thông tin thành công.");
        }
    }
}
