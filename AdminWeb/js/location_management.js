// location_management.js
class LocationManager {
    constructor() {
        this.apiBaseUrl = `${API_BASE_URL}/Gps`;
        this.locationList = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadLocationList();
    }

    bindEvents() {
        // Open modal
        document.getElementById('addLocationBtn').addEventListener('click', () => {
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
            const modal = document.getElementById('addLocationModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });

        // Form submit
        document.getElementById('addLocationForm').addEventListener('submit', (e) => {
            this.handleSubmit(e);
        });

        // Delete Location button click
        document.getElementById('locationTableBody').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const locationId = e.target.getAttribute('data-id');
                this.deleteLocation(locationId);
            }
        });

        // Edit Location button click
        document.getElementById('locationTableBody').addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const locationId = e.target.getAttribute('data-id');
                const location = this.locationList.find(l => l.id === parseInt(locationId, 10));
                if (location) {
                    this.openModalEdit(location);
                } else {
                    this.showError('Không tìm thấy Location để chỉnh sửa.');
                }
            }
        });

        // Get current location button
        document.getElementById('getCurrentLocationBtn').addEventListener('click', () => {
            this.getCurrentLocation();
        });
    }

    async getCurrentLocation() {
        const btn = document.getElementById('getCurrentLocationBtn');
        const status = document.getElementById('locationStatus');
        const latInput = document.getElementById('latitude');
        const lonInput = document.getElementById('longitude');

        // Check if geolocation is supported
        if (!navigator.geolocation) {
            status.textContent = '❌ Trình duyệt không hỗ trợ định vị GPS';
            status.className = 'location-status error';
            return;
        }

        // Show loading state
        btn.disabled = true;
        btn.textContent = '🔄 Đang lấy...';
        status.textContent = '📡 Đang truy cập GPS, vui lòng chờ và cho phép truy cập vị trí...';
        status.className = 'location-status loading';

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Success callback
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const accuracy = Math.round(position.coords.accuracy);

                latInput.value = lat.toFixed(15);
                lonInput.value = lon.toFixed(15);

                status.textContent = `✅ Đã lấy vị trí thành công! Độ chính xác: ${accuracy}m`;
                status.className = 'location-status success';

                // Reset button
                btn.disabled = false;
                btn.textContent = '📍 Lấy vị trí hiện tại';
            },
            (error) => {
                // Error callback
                let errorMessage = '';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = '❌ Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép trong cài đặt trình duyệt.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = '❌ Không thể xác định vị trí hiện tại. Hãy thử lại hoặc nhập thủ công.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = '❌ Hết thời gian chờ. Vui lòng thử lại hoặc kiểm tra kết nối GPS.';
                        break;
                    default:
                        errorMessage = '❌ Có lỗi xảy ra khi lấy vị trí. Vui lòng thử lại.';
                        break;
                }

                status.textContent = errorMessage;
                status.className = 'location-status error';

                // Reset button
                btn.disabled = false;
                btn.textContent = '📍 Lấy vị trí hiện tại';
            },
            options
        );
    }

    async deleteLocation(locationId) {
        if (!confirm('Bạn có chắc chắn muốn xóa vị trí này?')) return;
        try {
            this.showLoading(true);
            this.hideMessages();

            const response = await fetch(`${this.apiBaseUrl}/DeleteGpsLocation/${locationId}`, {
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
                await this.loadLocationList(); // Reload list
                this.showSuccess('Xóa vị trí thành công!');
            } else {
                throw new Error(result.message || 'Có lỗi xảy ra khi xóa vị trí');
            }

        } catch (error) {
            console.error('Error deleting:', error);
            this.showError(error.message || 'Không thể xóa vị trí. Vui lòng thử lại.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadLocationList() {
        try {
            this.showLoading(true);
            this.hideMessages();

            const response = await fetch(`${this.apiBaseUrl}/GetAllGps`, {
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
            this.locationList = data.data || data || [];
            this.renderLocationTable();

        } catch (error) {
            console.error('Error loading list:', error);
            this.showError('Không thể tải danh sách vị trí. Vui lòng thử lại.');
        } finally {
            this.showLoading(false);
        }
    }

    renderLocationTable() {
        const tableBody = document.getElementById('locationTableBody');
        const noDataMessage = document.getElementById('noDataMessage');
        const table = document.getElementById('locationTable');

        if (!this.locationList || this.locationList.length === 0) {
            table.style.display = 'none';
            noDataMessage.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        noDataMessage.style.display = 'none';

        const rows = this.locationList.map((location, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${this.escapeHtml(location.name || 'N/A')}</td>
                    <td>${location.latitude || 'N/A'}</td>
                    <td>${location.longitude || 'N/A'}</td>
                    <td>${location.radiusInMeters || 'N/A'} mét</td>
                    <td>
                        <button class="btn btn-danger delete-btn" style="background-color: red; color: white;" data-id="${location.id}" title="Xóa Vị trí">Xóa</button>
                        <button class="btn btn-secondary edit-btn" style="background-color: orange; color: white;" data-id="${location.id}" title="Chỉnh sửa Vị trí">Chỉnh sửa</button>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows;
    }

    openModal() {
        const modal = document.getElementById('addLocationModal');
        modal.style.display = 'block';
        this.resetForm();
        document.querySelector('#titleModal').textContent = 'Thêm Vị trí mới';
        document.querySelector('#submitBtn').textContent = 'Thêm Vị trí';
        document.querySelector('#submitBtn').removeAttribute('data-id');
    }

    openModalEdit(location) {
        const modal = document.getElementById('addLocationModal');
        modal.style.display = 'block';
        this.resetForm();
        const form = document.getElementById('addLocationForm');

        // Fill form with existing Location data
        form.querySelector('#locationName').value = location.name || '';
        form.querySelector('#latitude').value = location.latitude || '';
        form.querySelector('#longitude').value = location.longitude || '';
        form.querySelector('#radius').value = location.radiusInMeters || '';

        // Set the form to edit mode
        document.querySelector('#titleModal').textContent = 'Chỉnh sửa vị trí';
        form.querySelector('#submitBtn').textContent = 'Cập nhật vị trí';
        form.querySelector('#submitBtn').setAttribute('data-id', location.id);
    }

    closeModal() {
        const modal = document.getElementById('addLocationModal');
        modal.style.display = 'none';
        this.resetForm();
    }

    resetForm() {
        const form = document.getElementById('addLocationForm');
        form.reset();
        this.hideMessages();
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.hideMessages();
        const form = event.target;

        const locationData = {
            name: form.querySelector('#locationName').value.trim(),
            latitude: parseFloat(form.querySelector('#latitude').value.trim()),
            longitude: parseFloat(form.querySelector('#longitude').value.trim()),
            radiusInMeters: parseInt(form.querySelector('#radius').value.trim(), 10)
        };

        // Validate data
        if (!this.validateLocationData(locationData)) return;

        const locationId = form.querySelector('#submitBtn').getAttribute('data-id');

        try {
            this.showLoading(true);
            let response;

            if (locationId) {
                // Update existing Location
                response = await fetch(`${this.apiBaseUrl}/EditGpsLocation/${locationId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    },
                    body: JSON.stringify(locationData)
                });
            } else {
                // Create new Location
                response = await fetch(`${this.apiBaseUrl}/AddGpsLocation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    },
                    body: JSON.stringify(locationData)
                });
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success !== false) {
                this.closeModal();
                await this.loadLocationList(); // Reload list
                this.showSuccess(locationId ? 'Cập nhật vị trí thành công!' : 'Thêm vị trí thành công!');
            } else {
                throw new Error(result.message || 'Có lỗi xảy ra khi lưu vị trí');
            }

        } catch (error) {
            console.error('Error saving:', error);
            this.showError(error.message || 'Không thể lưu vị trí. Vui lòng thử lại.');
        } finally {
            this.showLoading(false);
        }
    }

    validateLocationData(data) {
        // Check required fields
        if (!data.name) {
            this.showError('Vui lòng nhập tên vị trí.');
            return false;
        }

        if (isNaN(data.latitude) || data.latitude < -90 || data.latitude > 90) {
            this.showError('Vui lòng nhập Vĩ độ hợp lệ (từ -90 đến 90).');
            return false;
        }

        if (isNaN(data.longitude) || data.longitude < -180 || data.longitude > 180) {
            this.showError('Vui lòng nhập Kinh độ hợp lệ (từ -180 đến 180).');
            return false;
        }

        if (isNaN(data.radiusInMeters) || data.radiusInMeters <= 0) {
            this.showError('Vui lòng nhập bán kính hợp lệ (lớn hơn 0).');
            return false;
        }

        return true;
    }

    showLoading(show) {
        const loading = document.getElementById('loadingSpinner');
        const container = document.getElementById('locationTableContainer');

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
    const employeeIdRaw = auth.getLocalStorageWithExpiry("employeeId");
    const employeeId = employeeIdRaw ? parseInt(employeeIdRaw) : null;

    if (!employeeId) {
        alert("Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.");
        auth.logout();
        return;
    }

    new LocationManager();

    const modal = document.getElementById('addLocationModal');
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