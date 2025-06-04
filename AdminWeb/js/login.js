document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    errorMessage.textContent = ""; // Xóa lỗi cũ

    try {
      const response = await fetch("https://localhost:5125/api/Authen/login", {
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

      // Lưu token vào localStorage
      localStorage.setItem("token", data.token);

       //  Lưu các thông tin cần thiết vào localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username || "");
      localStorage.setItem("role", data.role || "");
      localStorage.setItem("fullName", data.fullName || "");
      localStorage.setItem("userId", String(data.userId || ""));

      //  Chuyển employeeId thành chuỗi nếu là số
      if (data.employeeId !== undefined && data.employeeId !== null) {
        localStorage.setItem("employeeId", String(data.employeeId));
      } else {
        console.warn("Không có employeeId trong phản hồi API.");
      }

      //  Điều hướng sang trang chính
      window.location.href = "index.html";

    } catch (error) {
      errorMessage.textContent = "Lỗi kết nối đến server.";
      console.error("Login error:", error);
    }
  });
});
