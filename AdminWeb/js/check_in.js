// Hàm tính khoảng cách giữa 2 điểm GPS (sử dụng công thức Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Bán kính trái đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Chuyển đổi sang mét
}

// Hàm kiểm tra xem vị trí hiện tại có nằm trong phạm vi cho phép không
function isWithinAllowedLocation(currentLocation, allowedLocations, maxDistance = 100) {
    for (const location of allowedLocations) {
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            location.latitude,
            location.longitude
        );
        if (distance <= maxDistance) {
            return true;
        }
    }
    return false;
}

// Hàm lấy vị trí hiện tại
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Trình duyệt không hỗ trợ Geolocation'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    });
}

// Hàm lấy danh sách vị trí được phép từ API
async function getAllowedLocations() {
    try {
        const response = await fetch('/api/locations');
        if (!response.ok) {
            throw new Error('Không thể lấy danh sách vị trí');
        }
        return await response.json();
    } catch (error) {
        console.error('Lỗi khi lấy danh sách vị trí:', error);
        throw error;
    }
}

// Hàm gửi yêu cầu chấm công
async function submitCheckIn(location) {
    try {
        const response = await fetch('/api/check-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Không thể gửi yêu cầu chấm công');
        }

        return await response.json();
    } catch (error) {
        console.error('Lỗi khi gửi yêu cầu chấm công:', error);
        throw error;
    }
}

// Hàm hiển thị thông báo
function showMessage(message, isError = false) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
    statusMessage.style.display = 'block';
}

// Khởi tạo trang
async function initializePage() {
    const currentLocationSpan = document.getElementById('current-location');
    const allowedLocationsSpan = document.getElementById('allowed-locations');
    const checkInButton = document.getElementById('check-in-btn');
    let currentLocation = null;
    let allowedLocations = [];

    try {
        // Lấy danh sách vị trí được phép
        allowedLocations = await getAllowedLocations();
        allowedLocationsSpan.textContent = allowedLocations.map(loc => loc.name).join(', ');

        // Lấy vị trí hiện tại
        currentLocation = await getCurrentLocation();
        currentLocationSpan.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;

        // Kiểm tra xem có nằm trong vị trí được phép không
        if (isWithinAllowedLocation(currentLocation, allowedLocations)) {
            checkInButton.disabled = false;
        } else {
            showMessage('Bạn không nằm trong khu vực được phép chấm công', true);
        }
    } catch (error) {
        showMessage(error.message, true);
    }

    // Xử lý sự kiện click nút chấm công
    checkInButton.addEventListener('click', async () => {
        try {
            checkInButton.disabled = true;
            const result = await submitCheckIn(currentLocation);
            showMessage('Chấm công thành công!');
        } catch (error) {
            showMessage(error.message, true);
            checkInButton.disabled = false;
        }
    });
}

// Khởi tạo trang khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', initializePage); 