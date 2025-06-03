using System.Data;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.Data;
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

        public AuthenController(TimeLapsContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
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
        public IActionResult Login([FromBody] Login_model_request request)
        {
            // 1. Lấy user từ DB (include Role + Employee)
            var user = _context.Users
                .Include(u => u.Role)
                .Include(u => u.Employee)
                .Where(u => u.Username == request.Username && u.IsActive == true)
                .FirstOrDefault();

            if (user == null)
                return Unauthorized("Tài khoản không tồn tại hoặc đã bị khóa.");

            // 2. So sánh password (giả sử bạn lưu plain text. Nếu có mã hóa bcrypt, bạn cần verify)
            if (user.Password != request.Password)
                return Unauthorized("Mật khẩu không đúng.");

            // 3. Lấy role name
            var roleNameFromDb = user.Role?.RoleName ?? "Customer";

            var roleName = roleNameFromDb.ToLower() switch
            {
                "Admin" => "Admin",
                "Customer" => "Customer",
                _ => roleNameFromDb.ToLower()
            };

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
                UserId = user.UserId
            });
        }
        private static string GetRoleName(string roleNameFromDb)
        {
            if (string.IsNullOrEmpty(roleNameFromDb))
                return "Customer";

            return roleNameFromDb.ToLowerInvariant() switch
            {
                "admin" => "Admin",
                "customer" => "Customer",
                _ => CultureInfo.CurrentCulture.TextInfo.ToTitleCase(roleNameFromDb.ToLowerInvariant())
            };
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

                if (!VerifyPassword(request.Password, user.Password))
                {
                    return Unauthorized("Mật khẩu không đúng.");
                }

                // Tối ưu role mapping
                var roleName = GetRoleName(user.Role?.RoleName);
                var fullName = user.Employee?.FullName ?? user.Username;

                // Return response
                return Ok(new LoginResponse
                {
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

        // Updated method using BCrypt for password verification
        private bool VerifyPassword(string plainPassword, string hashedPassword)
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

        //// Updated method using BCrypt for password hashing
        private string HashPassword(string password)
        {
            // Generate salt and hash password with BCrypt
            // WorkFactor 12 provides good security balance between performance and security
            return BCrypt.Net.BCrypt.HashPassword(password, 12);
        }

        [HttpGet("GetUserInfo")]
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
            var roleName = GetRoleName(user.Role?.RoleName);
            return Ok(new EmployeeModel
            {
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
            if (!VerifyPassword(request.OldPassword, user.Password))
            {
                return Unauthorized("Mật khẩu cũ không đúng.");
            }
            // Mã hóa mật khẩu mới
            user.Password = HashPassword(request.NewPassword);
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return Ok("Đổi mật khẩu thành công.");
        }

        [HttpPost("ChangeInfo")]
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

        public class UserCreateDto
        {
            public string Username { get; set; }
            public string Email { get; set; }
        }


        [HttpPost("CreateMultiUser")]
        public async Task<IActionResult> CreateMultiUser([FromBody] List<UserCreateDto> users)
        {
            if (users == null || users.Count == 0)
            {
                return BadRequest("Danh sách người dùng không được để trống.");
            }

            var emails = users.Select(u => u.Email).ToList();

            var existingUsers = await _context.Users
                .Where(u => emails.Contains(u.Employee.Email) && u.IsActive == true)
                .ToListAsync();

            if (existingUsers.Count > 0)
            {
                return BadRequest("Một hoặc nhiều email đã tồn tại trong hệ thống.");
            }

            foreach (var userDto in users)
            {
                var employee = new Employee
                {
                    FullName = userDto.Username,
                    Email = userDto.Email,
                    IsActive = true
                };

                _context.Employees.Add(employee);
                await _context.SaveChangesAsync();

                var user = new User
                {
                    Username = userDto.Username,
                    Password = HashPassword("123456"),
                    RoleId = 2,
                    EmployeeId = employee.EmployeeId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
            }

            await _context.SaveChangesAsync();

            return Ok("Tạo người dùng thành công.");
        }

    }
}
