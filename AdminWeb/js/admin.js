// DOM Elements
const elements = {
  tableBody: document.getElementById('table-body'),
  monthInput: document.getElementById('month'),
  nameInput: document.getElementById('search-name'),
  exportButton: document.getElementById('export-btn'),
  searchButton: document.getElementById('search-button'),
  changeButton: document.getElementById('change_button'),
  popup: document.getElementById('popup'),
  popupEmployeeId: document.getElementById('popup-employeeId'),
  popupPaid: document.getElementById('popup-paid'),
  confirmBtn: document.getElementById('confirm-btn'),
  cancelBtn: document.getElementById('cancel-btn'),
  leaveRequestPopup: document.getElementById('leaveRequestPopup'),
  closeLeaveRequestPopup: document.getElementById('closeLeaveRequestPopup'),
  selectAllRequests: document.getElementById('selectAllRequests'),
  approveSelectedBtn: document.getElementById('approveSelectedBtn'),
  loading: document.getElementById('loading'),
  errorToast: document.getElementById('error-toast'),
  errorMessage: document.getElementById('error-message')
};

// State
const state = {
  currentEmpId: '',
  currentPaid: 0,
  currentUnpaid: 0,
  currentPending: 0,
  currentLeaveRequests: [],
  selectedRequestIds: [],
  isLoading: false
};

// Lưu leaveTypes toàn cục để filter
let globalLeaveTypes = [];
let globalLeaveRequests = [];

// Utility Functions
const showLoading = () => {
  state.isLoading = true;
  elements.loading.classList.remove('hidden');
};

const hideLoading = () => {
  state.isLoading = false;
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
  // Đóng bằng nút X
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.onclick = () => toast.classList.add('hidden');
  }
}

const showError = (message) => {
  showToast(message, 'error');
};

const formatDate = (date) => {
  return date.toISOString().slice(0, 7);
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Định dạng ngày (dd/MM/yyyy)
function formatDateVN(dateString) {
  if (!dateString) return 'Không xác định';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Không xác định';
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return 'Không xác định';
  }
}

// Định dạng ngày giờ (dd/MM/yyyy HH:mm)
function formatDateTimeVN(dateString) {
  if (!dateString) return 'Không xác định';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Không xác định';
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }) + ' ' + date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    return 'Không xác định';
  }
}

// Hàm chuyển trạng thái sang tiếng Việt
function getStatusText(status) {
  if (!status) return 'Không xác định';
  const statusMap = {
    'pending': 'Chờ duyệt',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối',
    'cancelled': 'Đã hủy'
  };
  return statusMap[status.toLowerCase()] || status || 'Không xác định';
}

// Hàm chuyển Loại nghỉ sang tiếng Việt
function getLeaveTypeText(type) {
  if (!type) return 'Không xác định';
  if (type.toLowerCase() === 'paid') return 'có phép';
  if (type.toLowerCase() === 'unpaid') return 'không phép';
  return type;
}

// API Functions
const loadData = async () => {
  const selectedMonth = elements.monthInput.value;
  const nameFilter = elements.nameInput.value.trim().toLowerCase();

    if (!selectedMonth || selectedMonth.length !== 7) {
    elements.tableBody.innerHTML = '<tr><td colspan="9">Vui lòng chọn tháng hợp lệ.</td></tr>';
      return;
    }

  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/TimeSkip/summary?month=${selectedMonth}`);
        if (!response.ok) throw new Error('Lỗi khi gọi API summary');
    const data = await response.json();

        const filtered = data.filter(emp => {
          const matchName = nameFilter ? emp.fullName.toLowerCase().includes(nameFilter) : true;
      return matchName;
        });

        if (filtered.length === 0) {
      elements.tableBody.innerHTML = '<tr><td colspan="9">Không tìm thấy nhân viên nào.</td></tr>';
          return;
        }

    elements.tableBody.innerHTML = filtered.map((emp, index) => `
      <tr>
            <td>${index + 1}</td>
            <td>${emp.fullName}</td>
            <td>${emp.totalWorkingDays}</td>
            <td>${emp.totalPaidLeaves}</td>
            <td>${emp.totalUnpaidLeaves}</td>
            <td>${emp.totalLateSessions}</td>
            <td>${emp.totalPendingLeaves || 0}</td>
        <td>${formatTime(emp.totalLateMinutes)}</td>
            <td>
          <button class="leaveRequest-btn" data-id="${emp.employeeId}" data-name="${emp.fullName}" aria-label="Xem đơn của ${emp.fullName}">
            <i class="fas fa-file-alt"></i>
            Xem đơn
          </button>
            </td>
      </tr>
    `).join('');

    // Attach event listeners to the newly created buttons
    attachLeaveRequestEvents();
  } catch (error) {
        console.error('Lỗi load data:', error);
    elements.tableBody.innerHTML = '<tr><td colspan="9">Không thể tải dữ liệu.</td></tr>';
    showError('Không thể tải dữ liệu. Vui lòng thử lại.');
  } finally {
    hideLoading();
  }
};

// Add new function to handle leave request button events
const attachLeaveRequestEvents = () => {
  const leaveRequestButtons = document.querySelectorAll('.leaveRequest-btn');
  leaveRequestButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const employeeId = button.getAttribute('data-id');
      const employeeName = button.getAttribute('data-name');
      
      if (!employeeId) {
        showError('Không tìm thấy thông tin nhân viên');
        return;
      }

      // Show popup first
      const popup = document.getElementById('leaveRequestPopup');
      if (popup) {
        popup.classList.remove('hidden');
      }

      // Then load the requests
      await loadLeaveRequests(employeeId, employeeName);
    });
  });
};

// Hàm fill dropdown loại nghỉ trong popup
function fillLeaveTypeFilter(leaveTypes, selectedValue = '') {
  const filter = document.getElementById('leaveTypeFilter');
  if (!filter) return;
  filter.innerHTML = '<option value="">-- Tất cả --</option>';
  leaveTypes.forEach(type => {
    filter.innerHTML += `<option value="${type.leaveTypeId}"${String(type.leaveTypeId) === String(selectedValue) ? ' selected' : ''}>${type.leaveTypeName}</option>`;
  });
}

// Hàm filter và hiển thị đơn theo loại nghỉ
function filterAndDisplayLeaveRequests(leaveTypeId, employeeName) {
  let filtered = globalLeaveRequests;
  if (leaveTypeId) {
    filtered = globalLeaveRequests.filter(r => String(r.leaveTypeId) === String(leaveTypeId));
  }
  displayLeaveRequests(filtered, employeeName, false); // false: không reset filter
}

// Sửa displayLeaveRequests để không fill lại filter nếu không cần
function displayLeaveRequests(requests, employeeName, resetFilter = true) {
  const leaveRequestList = document.getElementById('leaveRequestList');
  const popupEmployeeName = document.getElementById('popupEmployeeName');
  if (resetFilter) globalLeaveRequests = requests;
  leaveRequestList.innerHTML = '';
  if (popupEmployeeName) {
    popupEmployeeName.textContent = employeeName || 'Không xác định';
  }
  if (!requests || requests.length === 0) {
    leaveRequestList.innerHTML = '<div class="no-requests">Không có đơn nghỉ phép</div>';
    return;
  }
  // Sắp xếp theo fromTime mới nhất
  requests.sort((a, b) => new Date(b.fromTime) - new Date(a.fromTime));
  requests.forEach(request => {
    const requestItem = document.createElement('div');
    requestItem.className = 'leave-request-item';
    const leaveTypeRaw = request.leaveTypeName || request.leaveType;
    requestItem.innerHTML = `
      <div class="request-header">
        <label class="checkbox-label">
          <input type="checkbox" class="request-checkbox" data-request-id="${request.leaveId}">
          <span>${request.sessionName ? `<b>Ca:</b> ${request.sessionName}` : ''}</span>
        </label>
      </div>
      <div class="request-details">
        <p><strong>Loại nghỉ:</strong> ${getLeaveTypeText(leaveTypeRaw)}</p>
        <p><strong>Thời gian:</strong> ${formatDateTimeVN(request.fromTime)} - ${formatDateTimeVN(request.toTime)}</p>
        <p><strong>Lý do:</strong> ${request.reason || 'Không có'}</p>
        <p><strong>Trạng thái:</strong> ${getStatusText(request.status)}</p>
        <p><strong>Ngày gửi đơn:</strong> ${formatDateTimeVN(request.requestedAt)}</p>
        <p><strong>Người duyệt:</strong> ${request.processedByName || '-'}</p>
        <p><strong>Ngày duyệt:</strong> ${request.processedAt ? formatDateTimeVN(request.processedAt) : '-'}</p>
      </div>
    `;
    leaveRequestList.appendChild(requestItem);
  });
  attachCheckboxEvents();
}

const updateSelectedRequests = () => {
  const checkedBoxes = document.querySelectorAll('.request-item-checkbox:checked');
  state.selectedRequestIds = Array.from(checkedBoxes).map(checkbox => checkbox.value);
  
  if (elements.approveSelectedBtn) {
    elements.approveSelectedBtn.textContent = state.selectedRequestIds.length > 0 
      ? `Duyệt đã chọn (${state.selectedRequestIds.length})` 
      : 'Duyệt đã chọn';
    elements.approveSelectedBtn.disabled = state.selectedRequestIds.length === 0;
    }
};

const approveSelectedRequests = async () => {
  if (state.selectedRequestIds.length === 0) {
    showError('Vui lòng chọn ít nhất một đơn để duyệt.');
      return;
    }

  if (!confirm(`Bạn chắc chắn muốn duyệt ${state.selectedRequestIds.length} đơn đã chọn?`)) {
      return;
    }

  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/LeaveRequest/ApproveRequests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestIds: state.selectedRequestIds,
        isApproved: true
      })
    });

        if (!response.ok) throw new Error('Lỗi khi duyệt đơn');
    const result = await response.json();
    
        alert(result.message || 'Duyệt đơn thành công!');
    elements.leaveRequestPopup.classList.add('hidden');
        loadData();
  } catch (error) {
        console.error('Lỗi khi duyệt đơn:', error);
    showError(`Duyệt đơn thất bại: ${error.message}`);
  } finally {
    hideLoading();
  }
};

function exportToExcel() {
  // Lấy dữ liệu bảng (bỏ cột cuối cùng 'Duyệt đơn')
  const table = document.querySelector('table');
  if (!table) return;
  const rows = Array.from(table.querySelectorAll('tr'));
  const data = rows.map(row => {
    // Bỏ ô cuối cùng (Duyệt đơn)
    const cells = Array.from(row.querySelectorAll('th,td'));
    return cells.slice(0, -1).map(cell => cell.innerText);
  });

  // Tạo worksheet và workbook
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set độ rộng cột vừa với header
  if (data.length > 0) {
    ws['!cols'] = data[0].map((header, idx) => ({ wch: Math.max(10, String(header).length + 2) }));
  }

  // Thêm border cho tất cả các ô
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      if (!ws[cell_ref]) continue;
      if (!ws[cell_ref].s) ws[cell_ref].s = {};
      ws[cell_ref].s.border = {
        top:    { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left:   { style: 'thin', color: { rgb: '000000' } },
        right:  { style: 'thin', color: { rgb: '000000' } }
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bảng công');

  // Xuất file
  const now = new Date();
  const fileName = `bang-cong-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}.xlsx`;
  XLSX.writeFile(wb, fileName);
  }

// Event Listeners
const attachEventListeners = () => {
  // Search and Filter
  elements.monthInput.addEventListener('change', loadData);
  elements.nameInput.addEventListener('input', loadData);
  elements.searchButton.addEventListener('click', loadData);
  elements.exportButton.addEventListener('click', exportToExcel);
  elements.changeButton.addEventListener('click', () => {
    window.location.href = "Change_timezone.html";
  });

  // Popup Controls
  elements.closeLeaveRequestPopup?.addEventListener('click', () => {
    elements.leaveRequestPopup.classList.add('hidden');
      });

  elements.selectAllRequests?.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.request-item-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
    updateSelectedRequests();
  });

  elements.approveSelectedBtn?.addEventListener('click', approveSelectedRequests);

  // Checkbox Changes
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('request-item-checkbox')) {
      updateSelectedRequests();
      const allCheckboxes = document.querySelectorAll('.request-item-checkbox');
      const checkedCheckboxes = document.querySelectorAll('.request-item-checkbox:checked');
      if (elements.selectAllRequests) {
        elements.selectAllRequests.checked = allCheckboxes.length > 0 && 
          allCheckboxes.length === checkedCheckboxes.length;
      }
    }
  });

  // Error Toast Close
  document.querySelector('.toast-close')?.addEventListener('click', () => {
    elements.errorToast.classList.add('hidden');
  });
};

// Gắn sự kiện cho checkbox trong popup đơn nghỉ phép
function attachCheckboxEvents() {
  const checkboxes = document.querySelectorAll('.request-checkbox');
  const selectAll = document.getElementById('selectAllRequests');
  let approveBtn = document.getElementById('approveSelectedBtn');
  let rejectBtn = document.getElementById('rejectSelectedBtn');

  // Remove old event listeners by replacing node
  const approveBtnClone = approveBtn.cloneNode(true);
  approveBtn.parentNode.replaceChild(approveBtnClone, approveBtn);
  approveBtn = approveBtnClone;
  const rejectBtnClone = rejectBtn.cloneNode(true);
  rejectBtn.parentNode.replaceChild(rejectBtnClone, rejectBtn);
  rejectBtn = rejectBtnClone;

  // Khi chọn từng đơn
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checkedCount = document.querySelectorAll('.request-checkbox:checked').length;
      approveBtn.disabled = checkedCount === 0;
      rejectBtn.disabled = checkedCount === 0;
      if (checkedCount === checkboxes.length) {
        selectAll.checked = true;
      } else {
        selectAll.checked = false;
      }
    });
  });

  // Khi chọn "Chọn tất cả"
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
      });
      approveBtn.disabled = !selectAll.checked;
      rejectBtn.disabled = !selectAll.checked;
    });
  }

  // Reset trạng thái nút khi mở popup
  approveBtn.disabled = true;
  rejectBtn.disabled = true;

  // Gắn event xử lý duyệt/từ chối (chỉ 1 lần)
  if (approveBtn) {
    approveBtn.onclick = () => {
      const empId = window.currentLeaveEmployeeId;
      const empName = window.currentLeaveEmployeeName;
      processLeaveRequests('approve', empId, empName);
    };
  }
  if (rejectBtn) {
    rejectBtn.onclick = () => {
      const empId = window.currentLeaveEmployeeId;
      const empName = window.currentLeaveEmployeeName;
      processLeaveRequests('reject', empId, empName);
    };
  }
}

// Xử lý duyệt và từ chối đơn
function getSelectedRequestIds() {
  return Array.from(document.querySelectorAll('.request-checkbox:checked'))
    .map(cb => cb.getAttribute('data-request-id'))
    .filter(Boolean);
}

async function processLeaveRequests(action, employeeId, employeeName) {
  const requestIds = getSelectedRequestIds();
  if (!requestIds.length) {
    showError('Vui lòng chọn ít nhất 1 đơn để xử lý!');
    return;
  }
  const userId = auth.getLocalStorageWithExpiry('userId') || auth.getLocalStorageWithExpiry('employeeId') || auth.getLocalStorageWithExpiry('id');
  if (!userId) {
    showError('Không tìm thấy thông tin người duyệt');
    return;
  }
  showLoading();
  try {
    const url = action === 'approve'
      ? `${API_BASE_URL}/LeaveRequest/ApproveRequests`
      : `${API_BASE_URL}/LeaveRequest/RejectRequests`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestIds, processedById: userId })
    });
    if ([200, 201, 202, 204].includes(res.status)) {
      // Thành công
      await loadLeaveRequests(employeeId, employeeName);
      showToast(action === 'approve' ? 'Duyệt đơn thành công!' : 'Từ chối đơn thành công!', 'success');
    } else {
      // Thất bại
      showError('Lỗi xử lý đơn');
    }
  } catch (err) {
    showError('Lỗi xử lý đơn');
  } finally {
    hideLoading();
  }
}

// Khi mở popup, lưu lại employeeId, employeeName để dùng lại khi duyệt/từ chối
async function loadLeaveRequests(employeeId, employeeName) {
  window.currentLeaveEmployeeId = employeeId;
  window.currentLeaveEmployeeName = employeeName;
  if (!employeeId) {
    showError('Không tìm thấy thông tin nhân viên');
    return;
  }
  // Luôn mở popup trước khi fetch dữ liệu
    const popup = document.getElementById('leaveRequestPopup');
  if (popup) {
    popup.classList.remove('hidden');
  }
  showLoading();
  try {
    // Lấy leaveTypes nếu chưa có
    if (!globalLeaveTypes.length) {
      const res = await fetch(`${API_BASE_URL}/TimeSkip/leave-types`);
      if (res.ok) globalLeaveTypes = await res.json();
    }
    // Luôn fill lại filter và reset về '-- Tất cả --'
    fillLeaveTypeFilter(globalLeaveTypes, '');
    const response = await fetch(`${API_BASE_URL}/LeaveRequest/GetLeaveRequestByEmployeeId/${employeeId}`);
    if (!response.ok) throw new Error('Lỗi khi tải đơn nghỉ phép');
    const requests = await response.json();
    displayLeaveRequests(requests, employeeName, true);
    // Gắn sự kiện filter (luôn reset lại khi mở popup)
    const filter = document.getElementById('leaveTypeFilter');
    if (filter) {
      filter.onchange = (e) => {
        filterAndDisplayLeaveRequests(e.target.value, employeeName);
      };
    }
  } catch (error) {
    displayLeaveRequests([], employeeName, true);
  } finally {
    hideLoading();
  }
}

// Initialize
const init = () => {
  // Set current month
  elements.monthInput.value = formatDate(new Date());
  
  // Load initial data
  loadData();
  
  // Attach event listeners
  attachEventListeners();

  // Dropdown menu functionality
  const dropdownToggle = document.querySelector('.dropdown-toggle');
  const dropdown = document.querySelector('.dropdown');

  if (dropdownToggle && dropdown) {
    dropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  }
};

// Start the application
document.addEventListener("DOMContentLoaded", () => {
  const employeeIdRaw = auth.getLocalStorageWithExpiry("employeeId");
  const employeeId = employeeIdRaw ? parseInt(employeeIdRaw) : null;

  if (!employeeId) {
    alert("Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.");
    auth.logout();
    return;
  }
  init();
});
