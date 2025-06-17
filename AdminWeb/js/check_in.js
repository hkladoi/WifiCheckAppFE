// Hàm tính khoảng cách giữa 2 điểm GPS (sử dụng công thức Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Bán kính trái đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    const token = auth.getLocalStorageWithExpiry('token');
    try {
        const response = await fetch(`${API_BASE_URL}/Gps/GetAllGps`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
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
async function submitCheckIn(notes) {
    const checkInButton = document.getElementById('check-in-btn');
    const checkOutButton = document.getElementById('check-out-btn');
    try {
        const userEmail = auth.getLocalStorageWithExpiry('email');
        if (!userEmail) {
            throw new Error('Không tìm thấy email người dùng. Vui lòng đăng nhập lại.');
        }

        // Convert to Vietnam timezone
        const currentCheckInTime = new Date();
        const vietnamTime = new Date(currentCheckInTime.getTime() + (7 * 60 * 60 * 1000)); // Add 7 hours for Vietnam timezone
        const { lateMinute, checkinStatus } = calculateAttendanceStatus(vietnamTime, 'checkin');
        
        const hours = vietnamTime.getHours();
        const typecheck = hours < 12 ? 1 : 2; // 1 for morning, 2 for afternoon

        const response = await fetch(`${API_BASE_URL}/TimeSkip/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getLocalStorageWithExpiry('token')}`
            },
            body: JSON.stringify({
                email: userEmail,
                checkIn: vietnamTime.toISOString(),
                lateMinute: lateMinute,
                checkinStatus: checkinStatus,
                typecheck: typecheck,
                notes: notes
            })
        });

        let displayMessage;
        if (!response.ok) {
            displayMessage = await response.text();
            showMessage(displayMessage, true);
        } else {
            const jsonResponse = await response.json();
            displayMessage = jsonResponse.message;

            if (checkinStatus === "Đi muộn" && lateMinute > 0) {
                displayMessage += `\nĐi muộn: ${lateMinute} phút`;
            }
            showMessage(displayMessage, false);
        }

    } catch (error) {
        console.error('Lỗi khi gửi yêu cầu chấm công:', error);
        showMessage(error.message, true);
    } finally {
        checkInButton.disabled = false;
        checkOutButton.disabled = false;
    }
}

// Hàm gửi yêu cầu ra về (checkout)
async function submitCheckOut(notes) {
    const checkInButton = document.getElementById('check-in-btn');
    const checkOutButton = document.getElementById('check-out-btn');
    try {
        const userEmail = auth.getLocalStorageWithExpiry('email');
        if (!userEmail) {
            throw new Error('Không tìm thấy email người dùng. Vui lòng đăng nhập lại.');
        }

        // Convert to Vietnam timezone
        const currentCheckOutTime = new Date();
        const vietnamTime = new Date(currentCheckOutTime.getTime() + (7 * 60 * 60 * 1000)); // Add 7 hours for Vietnam timezone
        const { earlyCheckOutMinutes, checkoutStatus } = calculateAttendanceStatus(vietnamTime, 'checkout');

        const hours = vietnamTime.getHours();
        const typecheck = hours < 12 ? 1 : 2; // 1 for morning, 2 for afternoon
        console.log(vietnamTime.toISOString());

        const response = await fetch(`${API_BASE_URL}/TimeSkip/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getLocalStorageWithExpiry('token')}`
            },
            body: JSON.stringify({
                email: userEmail,
                checkOut: vietnamTime.toISOString(),
                earlyCheckOutMinutes: earlyCheckOutMinutes,
                checkoutStatus: checkoutStatus,
                typecheck: typecheck,
                noteout: notes
            })
        });

        let displayMessage;
        if (!response.ok) {
            displayMessage = await response.text();
            showMessage(displayMessage, true);
        } else {
            const jsonResponse = await response.json();
            displayMessage = jsonResponse.message;

            if (checkoutStatus === "Về sớm" && earlyCheckOutMinutes > 0) {
                displayMessage += `\nVề sớm: ${earlyCheckOutMinutes} phút`;
            }
            showMessage(displayMessage, false);
        }

    } catch (error) {
        console.error('Lỗi khi gửi yêu cầu ra về:', error);
        showMessage(error.message, true);
    } finally {
        checkInButton.disabled = false;
        checkOutButton.disabled = false;
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
    const noteInput = document.getElementById('note-input');
    const forceCheckLocationCheckbox = document.getElementById('force-check-location-checkbox');
    const statusMessage = document.getElementById('status-message');
    let currentLocation = null;
    let allowedLocations = [];

    try {
        // Lấy danh sách vị trí được phép
        allowedLocations = await getAllowedLocations();
        allowedLocationsSpan.textContent = allowedLocations.map(loc => loc.name + ` (${loc.radiusInMeters || 100}m)`).join(', ');

        // Lấy vị trí hiện tại và cập nhật UI
        currentLocation = await getCurrentLocation();
        currentLocationSpan.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;

        // Enable buttons by default
        checkInButton.disabled = false;
        checkOutButton.disabled = false;
        noteInput.disabled = true; // Initially disabled

    } catch (error) {
        showMessage(error.message, true);
        checkInButton.disabled = true;
        checkOutButton.disabled = true;
        noteInput.disabled = true;
    }

    // Function to update button states based on checkbox and note input
    function updateButtonStates() {
        if (!forceCheckLocationCheckbox.checked) {
            // If checkbox is not checked, enable buttons
            checkInButton.disabled = false;
            checkOutButton.disabled = false;
            noteInput.disabled = true;
        } else {
            // If checkbox is checked, enable note input and check note content
            noteInput.disabled = false;
            const hasNote = noteInput.value.trim().length > 0;
            checkInButton.disabled = !hasNote;
            checkOutButton.disabled = !hasNote;
        }
    }

    // Add checkbox event listener
    forceCheckLocationCheckbox.addEventListener('change', () => {
        updateButtonStates();
        if (forceCheckLocationCheckbox.checked) {
            statusMessage.style.display = 'none'; // Hide any existing message
        }
    });

    // Add note input event listener
    noteInput.addEventListener('input', updateButtonStates);

    // Xử lý sự kiện click nút chấm công (Check-in)
    checkInButton.addEventListener('click', async () => {
        try {
            checkInButton.disabled = true;
            checkOutButton.disabled = true;

            const userLocation = await getCurrentLocation();
            let notes = `Chấm công trên website.`;
            
            // Add user's note if checkbox is checked and note is provided
            if (forceCheckLocationCheckbox.checked) {
                notes += `Ngoài công ty ở vị trí ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`;
                if (noteInput.value.trim()) {
                    notes += `\nLý do: ${noteInput.value.trim()}`;
                }
            }
            
            const result = await submitCheckIn(notes);
        } catch (error) {
            showMessage(error.message, true);
            updateButtonStates(); // Restore button states after error
        }
    });

    // Xử lý sự kiện click nút ra về (Check-out)
    checkOutButton.addEventListener('click', async () => {
        try {
            checkInButton.disabled = true;
            checkOutButton.disabled = true;

            const userLocation = await getCurrentLocation();
            let notes = `Ra về trên website.`;
            
            // Add user's note if checkbox is checked and note is provided
            if (forceCheckLocationCheckbox.checked) {
                notes += `Ngoài công ty ở vị trí ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`;
                if (noteInput.value.trim()) {
                    notes += `\nLý do: ${noteInput.value.trim()}`;
                }
            }
            
            const result = await submitCheckOut(notes);
        } catch (error) {
            showMessage(error.message, true);
            updateButtonStates(); // Restore button states after error
        }
    });
}

// Khởi tạo trang khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => {

  initializePage();
}); 