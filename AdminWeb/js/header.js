document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    if (!auth.isAuthenticated()) {
        showToast("Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.", 'error');
        auth.logout();
        return;
    }

    // Load header menu
    try {
        const response = await fetch('header_menu.html');
        const html = await response.text();
        document.getElementById('header').innerHTML = html;

        // Update UI based on user role
        const role = auth.getLocalStorageWithExpiry("role");
        if (role.toLowerCase() === "admin") {
            document.getElementById('admin-link').style.display = 'block';
        }

        // Display user's full name
        const fullName = auth.getLocalStorageWithExpiry("fullName");
        if (fullName) {
            document.getElementById('user-name').textContent = fullName;
        }

        // Add click event for dropdown menu
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown) {
            userDropdown.addEventListener('click', function(e) {
                const dropdownMenu = document.getElementById('dropdown-menu');
                if (dropdownMenu) {
                    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
                }
            });
        }

        // Add click event for logout
        const logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                auth.logout();
            });
        }
    } catch (error) {
        console.error('Error loading header menu:', error);
    }
});

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