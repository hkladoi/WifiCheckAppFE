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

// Helper function to calculate lateMinute and checkinStatus / earlyCheckOutMinutes and checkoutStatus
function calculateAttendanceStatus(checkInOrOutTime, type) {
    const currentTime = new Date(checkInOrOutTime);
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();

    let expectedStartTimeMorning = new Date(currentTime);
    expectedStartTimeMorning.setHours(8, 0, 0, 0); // 8:00 AM

    let expectedEndTimeMorning = new Date(currentTime);
    expectedEndTimeMorning.setHours(12, 0, 0, 0); // 12:00 PM (end of morning shift for calculation)

    let expectedStartTimeAfternoon = new Date(currentTime);
    expectedStartTimeAfternoon.setHours(13, 30, 0, 0); // 1:30 PM

    let expectedEndTimeAfternoon = new Date(currentTime);
    expectedEndTimeAfternoon.setHours(17, 30, 0, 0); // 5:30 PM

    if (type === 'checkin') {
        let lateMinute = 0;
        let checkinStatus = "Đúng giờ";

        if (hours < 12) { // Morning check-in
            if (currentTime > expectedStartTimeMorning) {
                const diffInMs = currentTime.getTime() - expectedStartTimeMorning.getTime();
                lateMinute = Math.floor(diffInMs / (1000 * 60));
                checkinStatus = "Đi muộn";
            }
        } else { // Afternoon check-in
            if (currentTime > expectedStartTimeAfternoon) {
                const diffInMs = currentTime.getTime() - expectedStartTimeAfternoon.getTime();
                lateMinute = Math.floor(diffInMs / (1000 * 60));
                checkinStatus = "Đi muộn";
            }
        }
        return { lateMinute, checkinStatus };
    } else if (type === 'checkout') {
        let earlyCheckOutMinutes = 0;
        let checkoutStatus = "Đúng giờ";

        if (hours < 12) { // Morning check-out (assuming morning shift ends at 12:00 PM)
            if (currentTime < expectedEndTimeMorning) {
                const diffInMs = expectedEndTimeMorning.getTime() - currentTime.getTime();
                earlyCheckOutMinutes = Math.floor(diffInMs / (1000 * 60));
                checkoutStatus = "Về sớm";
            }
        } else { // Afternoon check-out (assuming afternoon shift ends at 5:30 PM)
            if (currentTime < expectedEndTimeAfternoon) {
                const diffInMs = expectedEndTimeAfternoon.getTime() - currentTime.getTime();
                earlyCheckOutMinutes = Math.floor(diffInMs / (1000 * 60));
                checkoutStatus = "Về sớm";
            }
        }
        return { earlyCheckOutMinutes, checkoutStatus };
    }
    return {};
}

// Hàm kiểm tra xem vị trí hiện tại có nằm trong phạm vi cho phép không
// Now takes allowedLocations which include radiusInMeters
function isWithinAllowedLocation(currentLocation, allowedLocations) {
    for (const location of allowedLocations) {
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            location.latitude,
            location.longitude
        );
        // Use location.radiusInMeters for comparison, default to 100 if not present
        const allowedRadius = location.radiusInMeters || 100;
        if (distance <= allowedRadius) {
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
        const response = await fetch(`${API_BASE_URL}/Gps/GetAllGps`);
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
async function submitCheckIn() {
    try {
        const userEmail = localStorage.getItem('email'); // Assuming email is stored in localStorage
        if (!userEmail) {
            throw new Error('Không tìm thấy email người dùng. Vui lòng đăng nhập lại.');
        }

        const currentCheckInTime = new Date();
        const { lateMinute, checkinStatus } = calculateAttendanceStatus(currentCheckInTime, 'checkin');

        const response = await fetch(`${API_BASE_URL}/TimeSkip/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                email: userEmail,
                checkIn: currentCheckInTime.toISOString(),
                lateMinute: lateMinute,
                checkinStatus: checkinStatus
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể gửi yêu cầu chấm công');
        }

        return await response.json();
    } catch (error) {
        console.error('Lỗi khi gửi yêu cầu chấm công:', error);
        throw error;
    }
}

// Hàm gửi yêu cầu ra về (checkout)
async function submitCheckOut() {
    try {
        const userEmail = localStorage.getItem('email');
        if (!userEmail) {
            throw new Error('Không tìm thấy email người dùng. Vui lòng đăng nhập lại.');
        }

        const currentCheckOutTime = new Date();
        const { earlyCheckOutMinutes, checkoutStatus } = calculateAttendanceStatus(currentCheckOutTime, 'checkout');

        const response = await fetch(`${API_BASE_URL}/TimeSkip/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                email: userEmail,
                checkOut: currentCheckOutTime.toISOString(),
                earlyCheckOutMinutes: earlyCheckOutMinutes,
                checkoutStatus: checkoutStatus
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể gửi yêu cầu ra về');
        }

        return await response.json();
    } catch (error) {
        console.error('Lỗi khi gửi yêu cầu ra về:', error);
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
    const checkOutButton = document.getElementById('check-out-btn');
    let currentLocation = null;
    let allowedLocations = [];
    let foundGpsId = 0;

    try {
        // Lấy danh sách vị trí được phép
        allowedLocations = await getAllowedLocations();
        allowedLocationsSpan.textContent = allowedLocations.map(loc => loc.name + ` (${loc.radiusInMeters || 100}m)`).join(', ');

        // Lấy vị trí hiện tại và cập nhật UI
        currentLocation = await getCurrentLocation();
        currentLocationSpan.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;

        // Kiểm tra xem có nằm trong vị trí được phép không
        const nearestLocation = allowedLocations.reduce((nearest, current) => {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                current.latitude,
                current.longitude
            );
            return (!nearest || distance < nearest.distance) ? { ...current, distance } : nearest;
        }, null);

        const isInValidLocation = nearestLocation && nearestLocation.distance <= (nearestLocation.radiusInMeters || 100);

        if (isInValidLocation) {
            checkInButton.disabled = false;
            checkOutButton.disabled = false; // Both can be enabled initially
            foundGpsId = nearestLocation.id; // Store gpsId for later use
        } else {
            showMessage('Bạn không nằm trong khu vực được phép chấm công', true);
            checkInButton.disabled = true;
            checkOutButton.disabled = true;
        }
    } catch (error) {
        showMessage(error.message, true);
        checkInButton.disabled = true;
        checkOutButton.disabled = true;
    }

    // Xử lý sự kiện click nút chấm công (Check-in)
    checkInButton.addEventListener('click', async () => {
        try {
            checkInButton.disabled = true;
            checkOutButton.disabled = true; // Disable both during processing

            const userLocation = await getCurrentLocation();
            // Re-check location and get gpsId before sending request
            const validLocations = await getAllowedLocations();
            let currentFoundGpsId = 0;

            const nearestLocation = validLocations.reduce((nearest, current) => {
              const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                current.latitude,
                current.longitude
              );
              return (!nearest || distance < nearest.distance) ? { ...current, distance } : nearest;
            }, null);

            if (nearestLocation && nearestLocation.distance <= (nearestLocation.radiusInMeters || 100)) {
                currentFoundGpsId = nearestLocation.id; 
            } else {
                throw new Error('Vị trí hiện tại không hợp lệ. Vui lòng thử lại ở vị trí khác.');
            }
            
            const result = await submitCheckIn(userLocation, currentFoundGpsId);
            showMessage('Chấm công thành công!', false);
            // No need to re-initializePage, as API handles status
        } catch (error) {
            showMessage(error.message, true);
            checkInButton.disabled = false;
            checkOutButton.disabled = false;
        }
    });

    // Xử lý sự kiện click nút ra về (Check-out)
    checkOutButton.addEventListener('click', async () => {
        try {
            checkInButton.disabled = true;
            checkOutButton.disabled = true; // Disable both during processing

            const userLocation = await getCurrentLocation(); // Re-check location
            const validLocations = await getAllowedLocations();
            let currentFoundGpsId = 0;

            const nearestLocation = validLocations.reduce((nearest, current) => {
                const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    current.latitude,
                    current.longitude
                );
                return (!nearest || distance < nearest.distance) ? { ...current, distance } : nearest;
            }, null);

            if (nearestLocation && nearestLocation.distance > (nearestLocation.radiusInMeters || 100)) {
                throw new Error('Bạn không nằm trong khu vực được phép ra về. Vui lòng thử lại ở vị trí khác.');
            } else {
                currentFoundGpsId = nearestLocation.id; // Store gpsId for checkout
            }

            const result = await submitCheckOut(userLocation, currentFoundGpsId);
            showMessage('Ra về thành công!', false);
            // No need to re-initializePage, as API handles status
        } catch (error) {
            showMessage(error.message, true);
            checkInButton.disabled = false;
            checkOutButton.disabled = false;
        }
    });
}

// Khởi tạo trang khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', initializePage); 