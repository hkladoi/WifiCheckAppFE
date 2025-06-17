// wifi_management.js
class WiFiManager {
    constructor() {
        this.apiBaseUrl = `${API_BASE_URL}/Wifi`;
        this.wifiList = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadWiFiList();
    }

    bindEvents() {
        // Open modal
        document.getElementById('addWifiBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Close modal events
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('addWifiModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });

        // Form submit
        document.getElementById('addWifiForm').addEventListener('submit', (e) => {
            this.handleSubmit(e);
        });

        // BSSID list formatting
        document.getElementById('bssidList').addEventListener('input', (e) => {
            this.formatBssidList(e);
        });

        // Delete WiFi button click
        document.getElementById('wifiTableBody').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const wifiId = e.target.getAttribute('data-id');
                this.deleteWiFi(wifiId);
            }
        });

        // Edit WiFi button click
        document.getElementById('wifiTableBody').addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const wifiId = e.target.getAttribute('data-id');
                const wifi = this.wifiList.find(w => w.id === parseInt(wifiId, 10));
                if (wifi) {
                    this.openModalEdit(wifi);
                } else {
                    this.showError('Không tìm thấy WiFi để chỉnh sửa.');
                }
            }
        });

        // Help dropdown functionality
        this.initHelpDropdowns();
    }
    async deleteWiFi(wifiId) {
        if (!confirm('Bạn có chắc chắn muốn xóa WiFi này?')) return;
        try {
            this.showLoading(true);
            this.hideMessages();

            const response = await fetch(`${this.apiBaseUrl}/DeleteWifiLocation/${wifiId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success !== false) {
                await this.loadWiFiList(); // Reload list
                this.showSuccess('Xóa WiFi thành công!');
            } else {
                throw new Error(result.message || 'Có lỗi xảy ra khi xóa WiFi');
            }

        } catch (error) {
            console.error('Error deleting WiFi:', error);
            this.showError(error.message || 'Không thể xóa WiFi. Vui lòng thử lại.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadWiFiList() {
        try {
            this.showLoading(true);
            this.hideMessages();

            const response = await fetch(`${this.apiBaseUrl}/GetAllWifi`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.wifiList = data.data || data || [];
            this.renderWiFiTable();
            
        } catch (error) {
            console.error('Error loading WiFi list:', error);
            this.showError('Không thể tải danh sách WiFi. Vui lòng thử lại.');
        } finally {
            this.showLoading(false);
        }
    }

    renderWiFiTable() {
        const tableBody = document.getElementById('wifiTableBody');
        const noDataMessage = document.getElementById('noDataMessage');
        const table = document.getElementById('wifiTable');

        if (!this.wifiList || this.wifiList.length === 0) {
            table.style.display = 'none';
            noDataMessage.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        noDataMessage.style.display = 'none';

        const rows = this.wifiList.map((wifi, index) => {
            // Format BSSID list
            let bssidDisplay = 'N/A';
            if (wifi.wifiBssids && Array.isArray(wifi.wifiBssids) && wifi.wifiBssids.length > 0) {
                const bssidList = wifi.wifiBssids.map(item => item.bssid).filter(bssid => bssid);
                if (bssidList.length > 0) {
                    if (bssidList.length <= 3) {
                        bssidDisplay = bssidList.join('<br>');
                    } else {
                        bssidDisplay = bssidList.slice(0, 3).join('<br>') + 
                                     `<br><small style="color: #666;">+${bssidList.length - 3} khác...</small>`;
                    }
                }
            }
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${this.escapeHtml(wifi.ssid || 'N/A')}</td>
                    <td>${bssidDisplay}</td>
                    <td>
                        <button class="btn btn-danger delete-btn" style="background-color: red; color: white;" data-id="${wifi.id}" title="Xóa WiFi" id="deleteWifi">Xóa</button>
                        <button class="btn btn-secondary edit-btn" style="background-color: orange; color: white;" data-id="${wifi.id}" title="Chỉnh sửa WiFi" id="editWifi">Chỉnh sửa</button>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows;
    }

    openModal() {
        const modal = document.getElementById('addWifiModal');
        modal.style.display = 'block';
        this.resetForm();
    }

    openModalEdit(wifi) {
        const modal = document.getElementById('addWifiModal');
        modal.style.display = 'block';
        this.resetForm();
        const form = document.getElementById('addWifiForm');
        // Fill form with existing WiFi data
        form.querySelector('#wifiName').value = wifi.ssid || '';
        form.querySelector('#bssidList').value = wifi.wifiBssids && Array.isArray(wifi.wifiBssids) 
            ? wifi.wifiBssids.map(item => item.bssid).join('\n') 
            : '';
        // Set the form to edit mode
        document.querySelector('#titleModal').textContent = 'Chỉnh sửa WiFi';
        form.querySelector('#submitBtn').textContent = 'Cập nhật WiFi';
        form.querySelector('#submitBtn').setAttribute('data-id', wifi.id);
    }

    closeModal() {
        const modal = document.getElementById('addWifiModal');
        modal.style.display = 'none';
        this.resetForm();
    }

    resetForm() {
        const form = document.getElementById('addWifiForm');
        form.reset();
        this.hideMessages();
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.hideMessages();
        const form = event.target;
        const wifiData = {
            ssid: form.querySelector('#wifiName').value.trim(),
            wifiBssids: this.parseBssidList(form.querySelector('#bssidList').value.trim())
        };
        // Validate data
        if (!this.validateWiFiData(wifiData)) return;
        const wifiId = form.querySelector('#submitBtn').getAttribute('data-id');
        try {
            this.showLoading(true);
            let response;
            if (wifiId) {
                // Update existing WiFi
                response = await fetch(`${this.apiBaseUrl}/UpdateWifiLocation/${wifiId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    },
                    body: JSON.stringify(wifiData)
                });
            } else {
                // Create new WiFi
                response = await fetch(`${this.apiBaseUrl}/AddWifiLocation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    },
                    body: JSON.stringify(wifiData)
                });
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success !== false) {
                this.closeModal();
                await this.loadWiFiList(); // Reload list
                this.showSuccess(wifiId ? 'Cập nhật WiFi thành công!' : 'Thêm WiFi thành công!');
            } else {
                throw new Error(result.message || 'Có lỗi xảy ra khi lưu WiFi');
            }
        } catch (error) {
            console.error('Error saving WiFi:', error);
            this.showError(error.message || 'Không thể lưu WiFi. Vui lòng thử lại.');
        }
        finally {
            this.showLoading(false);
        }
    }

    validateWiFiData(data) {
        // Check required fields
        if (!data.ssid) {
            this.showError('Vui lòng nhập tên WiFi (SSID).');
            return false;
        }

        if (!data.wifiBssids || data.wifiBssids.length === 0) {
            this.showError('Vui lòng nhập ít nhất một BSSID.');
            return false;
        }

        return true;
    }

    parseBssidList(bssidText) {
        if (!bssidText) return [];
        
        const lines = bssidText.split('\n').map(line => line.trim()).filter(line => line);
        const validBssids = [];
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        
        for (const line of lines) {
            if (macRegex.test(line)) {
                validBssids.push({ bssid: line.toUpperCase() });
            }
        }
        
        return validBssids;
    }

    formatBssidList(event) {
        const lines = event.target.value.split('\n');
        const formattedLines = lines.map(line => {
            let value = line.replace(/[^0-9A-Fa-f]/g, '');
            let formatted = '';
            
            for (let i = 0; i < value.length && i < 12; i += 2) {
                if (i > 0) formatted += ':';
                formatted += value.substr(i, 2);
            }
            
            return formatted.toUpperCase();
        });
        
        event.target.value = formattedLines.join('\n');
    }

    initHelpDropdowns() {
        const helpBtns = document.querySelectorAll('.help-btn');
        const helpContents = document.querySelectorAll('.help-content');
        
        helpBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.getAttribute('data-target');
                const content = document.getElementById(target);
                const isActive = btn.classList.contains('active');
                
                // Hide all content and remove active class
                helpContents.forEach(c => c.classList.remove('show'));
                helpBtns.forEach(b => b.classList.remove('active'));
                
                // Toggle current content
                if (!isActive) {
                    content.classList.add('show');
                    btn.classList.add('active');
                }
            });
        });
        
        // Close help when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.bssid-help')) {
                helpContents.forEach(c => c.classList.remove('show'));
                helpBtns.forEach(b => b.classList.remove('active'));
            }
        });
    }

    showLoading(show) {
        const loading = document.getElementById('loadingSpinner');
        const container = document.getElementById('wifiTableContainer');
        
        if (show) {
            loading.style.display = 'block';
            container.style.display = 'none';
        } else {
            loading.style.display = 'none';
            container.style.display = 'block';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }

    hideMessages() {
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN');
        } catch (error) {
            return 'N/A';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getAuthToken() {
        return auth.getLocalStorageWithExpiry('token') || sessionStorage.getItem('token') || getCookie('token');
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // const employeeIdRaw = auth.getLocalStorageWithExpiry("employeeId");
    // const employeeId = employeeIdRaw ? parseInt(employeeIdRaw) : null;

    if (!auth.isAuthenticated()) {
        alert("Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.");
        auth.logout();
        return;
    }

    new WiFiManager();

    const modal = document.getElementById('addWifiModal');
  const modalContent = document.querySelector('.modal-content');

  modal.addEventListener('click', function (e) {
    if (!modalContent.contains(e.target)) {
        e.stopPropagation();
    }
  });
});

let loadingInterval = null;
function showLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (!spinner) return;
  spinner.style.display = 'flex';
  let dotCount = 1;
  spinner.textContent = 'Đang tải dữ liệu.';
  loadingInterval = setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    spinner.textContent = 'Đang tải dữ liệu' + '.'.repeat(dotCount);
  }, 400);
}
function hideLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (!spinner) return;
  spinner.style.display = 'none';
  spinner.textContent = 'Đang tải dữ liệu';
  if (loadingInterval) clearInterval(loadingInterval);
}