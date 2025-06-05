const currentPath = window.location.pathname;

  // Chỉ kiểm tra đăng nhập và load header nếu không phải trang login
  if (!currentPath.includes("login.html")) {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      // Nếu chưa đăng nhập thì về login
      window.location.href = "login.html";
    } else {
      // Nếu đã đăng nhập thì load header
      fetch('header_menu.html')
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
            window.location.href = "login.html";
          });

          console.log(role);
          // Ẩn mục "Quản trị" nếu không phải Admin
          if (role !== "Admin") {
            const adminLink = document.querySelector('a[href="admin.html"]');
            if (adminLink) {
              adminLink.style.display = "none";
            }
          }
        })
        .catch(err => console.error('Lỗi tải header:', err));
    }
  }