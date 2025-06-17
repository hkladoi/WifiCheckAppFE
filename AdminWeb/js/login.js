document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");
  
  // Toast notification function
  function showToast(message, type = 'success') {
    const toast = document.getElementById('error-toast');
    const msg = document.getElementById('error-message');
    if (!toast || !msg) return;
    msg.textContent = message;
    toast.classList.remove('hidden', 'toast-error', 'toast-success');
    toast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');
    toast.classList.add('toast');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
    // Đóng bằng nút X
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.onclick = () => toast.classList.add('hidden');
    }
  }

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
        showToast(errorData || "Đăng nhập thất bại.", 'error');
        button.disabled = false;
        button.textContent = "Đăng nhập";
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

      showToast("Đăng nhập thành công!", 'success');
      button.disabled = false;
      button.textContent = "Đăng nhập";

      // Điều hướng sang trang chính
      window.location.href = "index.html";

    } catch (error) {
      showToast("Lỗi kết nối đến server.", 'error');
      console.error("Login error:", error);
      button.disabled = false;
      button.textContent = "Đăng nhập";
    }
  });
});
