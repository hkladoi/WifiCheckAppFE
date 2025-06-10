document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = document.getElementById("btnLogin");
    button.disabled = true;
    button.textContent = "Đang đăng nhập...";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    errorMessage.textContent = ""; // Xóa lỗi cũ

    try {
      const response = await fetch(`${API_BASE_URL}/Authen/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        // Lấy lỗi từ API nếu có
        const errorData = await response.text();
        errorMessage.textContent = errorData || "Đăng nhập thất bại.";
        return;
      }

      const data = await response.json();

      // Lưu các thông tin cần thiết vào localStorage với thời hạn
      auth.setLocalStorageWithExpiry("token", data.token);
      auth.setLocalStorageWithExpiry("username", data.username || "");
      auth.setLocalStorageWithExpiry("role", data.role || "");
      auth.setLocalStorageWithExpiry("fullName", data.fullName || "");
      auth.setLocalStorageWithExpiry("userId", String(data.userId || ""));
      auth.setLocalStorageWithExpiry("email", data.email || "");

      // Chuyển employeeId thành chuỗi nếu là số
      if (data.employeeId !== undefined && data.employeeId !== null) {
        auth.setLocalStorageWithExpiry("employeeId", String(data.employeeId));
      } else {
        console.warn("Không có employeeId trong phản hồi API.");
      }

      alert("Đăng nhập thành công!");
      button.disabled = false;
      button.textContent = "Đăng nhập";

      // Điều hướng sang trang chính
      window.location.href = "index.html";

    } catch (error) {
      errorMessage.textContent = "Lỗi kết nối đến server.";
      console.error("Login error:", error);
    }
  });
});
