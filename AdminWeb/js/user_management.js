// DOM Elements
const elements = {
  tableBody: document.getElementById('table-body'),
  nameInput: document.getElementById('search-name'),
  searchButton: document.getElementById('search-button'),
  loading: document.getElementById('loading'),
  errorToast: document.getElementById('error-toast'),
  errorMessage: document.getElementById('error-message'),
  userDetailPopup: document.getElementById('userDetailPopup'),
  updateUserBtn: document.getElementById('updateUserBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  detailUserName: document.getElementById('detail-userName'),
  detailFullName: document.getElementById('detail-fullName'),
  detailGender: document.getElementById('detail-gender'),
  detailDateOfBirth: document.getElementById('detail-dateOfBirth'),
  detailDepartment: document.getElementById('detail-department'),
  detailPosition: document.getElementById('detail-position'),
  detailPhone: document.getElementById('detail-phone'),
  detailEmail: document.getElementById('detail-email'),
  detailIsActive: document.getElementById('detail-isActive'),
  detailEmployeeId: document.getElementById('detail-employeeId'),

};

// Utility Functions
const showLoading = () => {
  elements.loading.classList.remove('hidden');
};

const hideLoading = () => {
  elements.loading.classList.add('hidden');
};

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
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.onclick = () => toast.classList.add('hidden');
  }
}

const showError = (message) => {
  showToast(message, 'error');
};

// Định dạng ngày (dd/MM/yyyy) cho hiển thị
function formatDateVN(dateString) {
  if (!dateString) return 'Không xác định';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Không xác định';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}/${year}`;
  } catch (error) {
    return 'Không xác định';
  }
}

// Định dạng ngày (yyyy-MM-dd) cho input type="date"
function formatDateForInput(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

// Function to show the user detail popup
const showUserDetailPopup = () => {
  elements.userDetailPopup.classList.remove('hidden');
};

// Function to hide the user detail popup
const hideUserDetailPopup = () => {
  elements.userDetailPopup.classList.add('hidden');
};

// API Functions
const fetchUserDetails = async (employeeId) => {
  showLoading();
  const token = auth.getLocalStorageWithExpiry('token');
  try {
    const response = await fetch(`${API_BASE_URL}/Authen/GetUserInfo?employeeId=${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const userDetail = await response.json();
    
    // Populate modal fields
    elements.detailUserName.value = userDetail.userName || '';
    elements.detailFullName.value = userDetail.fullName || '';
    elements.detailGender.value = userDetail.gender || '';
    elements.detailDateOfBirth.value = formatDateForInput(userDetail.dateOfBirth); // For date input
    elements.detailDepartment.value = userDetail.department || '';
    elements.detailPosition.value = userDetail.position || '';
    elements.detailPhone.value = userDetail.phone || '';
    elements.detailEmail.value = userDetail.email || '';
    elements.detailIsActive.value = String(userDetail.isActive); // Convert boolean to string for select
    elements.detailEmployeeId.value = userDetail.employeeId || '';

    showUserDetailPopup();
  } catch (error) {
    console.error('Lỗi tải thông tin chi tiết người dùng:', error);
    showError('Không thể tải thông tin chi tiết người dùng. Vui lòng thử lại.');
  } finally {
    hideLoading();
  }
};

const updateUser = async () => {
  showLoading();
  const token = auth.getLocalStorageWithExpiry('token');
  const employeeId = elements.detailEmployeeId.value;

  const updatedUser = {
    employeeId: parseInt(employeeId), // Ensure it's a number
    userName: elements.detailUserName.value,
    fullName: elements.detailFullName.value,
    gender: elements.detailGender.value,
    dateOfBirth: elements.detailDateOfBirth.value, // YYYY-MM-DD format
    department: elements.detailDepartment.value,
    position: elements.detailPosition.value,
    phone: elements.detailPhone.value,
    email: elements.detailEmail.value,
    // hireDate: elements.detailHireDate.value, // YYYY-MM-DD format
    isActive: elements.detailIsActive.value === 'true', // Convert string back to boolean
    // role: elements.detailRole.value
  };

  try {
    const response = await fetch(`${API_BASE_URL}/Admin/UpdateEmployee`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedUser)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    showToast('Cập nhật thông tin người dùng thành công!', 'success');
    hideUserDetailPopup();
    loadUsers(); // Reload the table to reflect changes
  } catch (error) {
    console.error('Lỗi cập nhật người dùng:', error);
    showError('Không thể cập nhật thông tin người dùng. Vui lòng thử lại.');
  } finally {
    hideLoading();
  }
};

const cancelEdit = () => {
  hideUserDetailPopup();
};

const loadUsers = async () => {
  const nameFilter = elements.nameInput.value.trim().toLowerCase();
  const token = auth.getLocalStorageWithExpiry('token'); 

  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/Admin/GetAllEmployee`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const filteredUsers = data.filter(user => {
      const matchName = nameFilter ? user.fullName.toLowerCase().includes(nameFilter) || user.userName.toLowerCase().includes(nameFilter) : true;
      return matchName;
    });

    if (filteredUsers.length === 0) {
      elements.tableBody.innerHTML = '<tr><td colspan="9">Không tìm thấy người dùng nào.</td></tr>';
      return;
    }

    elements.tableBody.innerHTML = filteredUsers.map((user, index) => `
      <tr class="user-row" data-id="${user.employeeId}" data-user-id="${user.userId || ''}">
        <td>${index + 1}</td>
        <td>${user.userName || 'N/A'}</td>
        <td>${user.fullName || 'N/A'}</td>
        <td>${user.gender || 'N/A'}</td>
        <td>${formatDateVN(user.dateOfBirth) || 'N/A'}</td>
        <td>${user.phone || 'N/A'}</td>
        <td>${user.email || 'N/A'}</td>
        <td><span class="status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Hoạt động' : 'Không hoạt động'}</span></td>
        <td>
          <button class="btn-reset-password" data-user-id="${user.userId}">
            <i class="fas fa-sync-alt"></i> Reset
          </button>
        </td>
      </tr>
    `).join('');

    // Attach event listeners to user rows
    attachUserRowEvents();
    attachResetPasswordButtonEvents();

  } catch (error) {
    console.error('Lỗi tải dữ liệu người dùng:', error);
    elements.tableBody.innerHTML = '<tr><td colspan="9">Không thể tải dữ liệu người dùng.</td></tr>';
    showError('Không thể tải dữ liệu người dùng. Vui lòng thử lại.');
  } finally {
    hideLoading();
  }
};

// Attach event listeners to the new detail buttons
const attachUserRowEvents = () => {
  const userRows = document.querySelectorAll('.user-row');
  userRows.forEach(row => {
    row.addEventListener('click', (e) => {
      const employeeId = e.currentTarget.dataset.id;
      if (employeeId) {
        fetchUserDetails(employeeId);
      }
    });
  });
};

// Function to handle reset password
const resetUserPassword = async (userId) => {
  showLoading();
  const token = auth.getLocalStorageWithExpiry('token');
  try {
    const response = await fetch(`${API_BASE_URL}/Admin/ResetPasswordDefault?userId=${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    showToast('Mật khẩu đã được đặt lại thành công!', 'success');
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    showError('Không thể đặt lại mật khẩu. Vui lòng thử lại.');
  } finally {
    hideLoading();
  }
};

// Attach event listeners to reset password buttons
const attachResetPasswordButtonEvents = () => {
  const resetButtons = document.querySelectorAll('.btn-reset-password');
  resetButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation(); // Prevent row click event
      const userId = e.currentTarget.dataset.userId;
      if (userId) {
        if (confirm('Bạn có chắc chắn muốn đặt lại mật khẩu cho người dùng này không?')) {
          await resetUserPassword(userId);
        }
      }
    });
  });
};

// Event Listeners
const attachEventListeners = () => {
  elements.searchButton.addEventListener('click', loadUsers);
  elements.nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadUsers();
    }
  });
  elements.updateUserBtn.addEventListener('click', updateUser);
  elements.cancelEditBtn.addEventListener('click', cancelEdit);
  // Close popup when clicking outside (only if not clicking inside the content)
  elements.userDetailPopup.addEventListener('click', (e) => {
    if (e.target === elements.userDetailPopup) {
      hideUserDetailPopup();
    }
  });
};

// Initialization
const init = () => {
  attachEventListeners();
  loadUsers(); // Initial load of users when the page loads
};

document.addEventListener("DOMContentLoaded", () => {

    loadUsers();
    // Attach global event listeners
  }); 