const currentPath = window.location.pathname;

  // Chỉ kiểm tra đăng nhập và load header nếu không phải trang login
  if (currentPath !== "/html/login.html") {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      // Nếu chưa đăng nhập thì về login
      window.location.href = "/html/login.html";
    } else {
      // Nếu đã đăng nhập thì load header
      fetch('/html/header_menu.html')
        .then(response => response.text())
        .then(data => {
          document.getElementById('header').innerHTML = data;

          const fullName = localStorage.getItem("fullName");
          const userNameSpan = document.getElementById("user-name");

          if (fullName) {
            userNameSpan.textContent = fullName + " ▼";
          }

          userNameSpan.addEventListener("click", () => {
            const dropdown = document.getElementById("dropdown-menu");
            dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
          });

          document.getElementById("logout").addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "/html/login.html";
          });

          // Ẩn mục "Quản trị" nếu không phải admin
          if (role !== "admin") {
            const adminLink = document.querySelector('a[href="/html/admin.html"]');
            if (adminLink) {
              adminLink.style.display = "none";
            }
          }
        })
        .catch(err => console.error('Lỗi tải header:', err));
    }
  }