document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    // const token = auth.getLocalStorageWithExpiry("token");
    // if (!token) {
    //     window.location.href = "login.html";
    //     return;
    // }

    // Load header menu
    try {
        const response = await fetch('header_menu.html');
        const html = await response.text();
        document.getElementById('header').innerHTML = html;

        // Update UI based on user role
        const role = auth.getLocalStorageWithExpiry("role");
        if (role === "admin") {
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
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                auth.clearLocalStorage();
                window.location.href = "login.html";
            });
        }
    } catch (error) {
        console.error('Error loading header menu:', error);
    }
});