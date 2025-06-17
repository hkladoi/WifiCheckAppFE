document.addEventListener("DOMContentLoaded", () => {
  // const employeeIdRaw = auth.getLocalStorageWithExpiry("employeeId");
  // const employeeId = employeeIdRaw ? parseInt(employeeIdRaw) : null;

  if (!auth.isAuthenticated()) {
    alert("Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.");
    auth.logout();
    return;
  }

  const tbody = document.getElementById("days-body");
  const userId = auth.getLocalStorageWithExpiry("userId");
  const selectedDateInput = document.getElementById("date");
  const searchButton = document.getElementById("search-button");
  const searchInput = document.getElementById("search-name");
  const sessionSelect = document.getElementById("session");

  let searchTerm = "";
  let selectedSession = "1"; // Mặc định là ca sáng

  console.log("UserID:", userId);

  // --- 1. Khi trang load, tự động lấy ngày mới nhất ---
  try {
    const latestDate = new Date().toISOString().split('T')[0];
    selectedDateInput.value = latestDate;
    loadDataForDate(latestDate, searchTerm, selectedSession);
  } catch (err) {
    console.error(err);
  }

  // --- 2. Khi chọn ngày khác, tải lại dữ liệu ---
  selectedDateInput.addEventListener("change", () => {
    const selectedDate = selectedDateInput.value;
    if (selectedDate) {
      loadDataForDate(selectedDate, searchTerm, selectedSession);
    }
  });

  // --- 3. Khi chọn ca khác ---
  sessionSelect.addEventListener("change", () => {
    selectedSession = sessionSelect.value;
    const selectedDate = selectedDateInput.value;
    if (selectedDate) {
      loadDataForDate(selectedDate, searchTerm, selectedSession);
    }
  });

  // --- 4. Search ---
  searchButton.addEventListener("click", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    const selectedDate = selectedDateInput.value;

    if (!selectedDate) {
      alert("Vui lòng chọn ngày trước khi tìm kiếm.");
      return;
    }

    loadDataForDate(selectedDate, searchTerm, selectedSession);
  });

  // --- Hàm chính để gọi API lấy dữ liệu chấm công và vẽ bảng ---
  function loadDataForDate(date, searchTerm = "", session = "1") {
    const token = auth.getLocalStorageWithExpiry('token');
    fetch(`${API_BASE_URL}/Admin/daily-summary?workDate=${date}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Lỗi khi tải dữ liệu");
        return res.json();
      })
      .then(data => {
        tbody.innerHTML = "";

        const filtered = data.filter(row => {
          const nameMatch = row.employeeName.toLowerCase().includes(searchTerm);
          const sessionData = session === "1" ? row.morningSession : row.afternoonSession;
          return nameMatch && sessionData;
        });

        filtered.forEach(row => {
          const tr = document.createElement("tr");
          tr.dataset.employeeId = row.employeeId;
          
          // Lấy dữ liệu theo session đã chọn
          const sessionData = session === "1" ? row.morningSession : row.afternoonSession;
          const attendanceId = sessionData?.attendanceId;

          tr.dataset.attendanceId = attendanceId ?? "";
          tr.dataset.sessionId = session;

          tr.innerHTML = `
            <td>${row.stt}</td>
            <td>${row.employeeName}</td>
            <td><input type="time" class="check-in" value="${sessionData?.checkInTime || ""}" /></td>
            <td><input type="time" class="check-out" value="${sessionData?.checkOutTime || ""}" /></td>
            <td><textarea class="notes" readonly>${sessionData?.notes || ""}</textarea></td>
            <td><textarea class="noteOut" readonly>${sessionData?.noteOut || ""}</textarea></td>
            <td><textarea class="reason" placeholder="Nhập lý do" rows="3"></textarea></td>
            <td><button type="button" class="save-btn">Lưu</button></td>
          `;

          tbody.appendChild(tr);
        });

        attachSaveHandlers();
      })
      .catch(err => {
        console.error(err);
      });
  }

  // --- Gán sự kiện Save cho nút "Lưu" ---
  function attachSaveHandlers() {
    document.querySelectorAll(".save-btn").forEach(button => {
      button.addEventListener("click", async function () {
        const row = this.closest("tr");
        const selectedDate = selectedDateInput.value;
        const performedBy = userId;

        const employeeId = row.dataset.employeeId;
        const attendanceId = row.dataset.attendanceId;
        const sessionId = row.dataset.sessionId;

        const checkIn = row.querySelector(".check-in").value;
        const checkOut = row.querySelector(".check-out").value;
        const reason = row.querySelector(".reason").value?.trim();

        if (!checkIn && !checkOut && !reason) {
          alert("Không có dữ liệu nào để lưu.");
          return;
        }

        const payload = attendanceId ? {
          attendanceId: Number(attendanceId),
          checkInTime: checkIn ? `${selectedDate}T${checkIn}:00` : null,
          checkOutTime: checkOut ? `${selectedDate}T${checkOut}:00` : null,
          reason: reason || "",
          performedBy,
          sessionId: Number(sessionId)
        } : {
          employeeId: Number(employeeId),
          sessionId: Number(sessionId),
          workDate: selectedDate,
          checkInTime: checkIn ? `${selectedDate}T${checkIn}:00` : null,
          checkOutTime: checkOut ? `${selectedDate}T${checkOut}:00` : null,
          reason: reason || "",
          performedBy
        };

        try {
          const res = await fetch(`${API_BASE_URL}/Admin/ModifyAttendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const errorData = await res.text();
            throw new Error(`Lỗi khi lưu: ${errorData}`);
          }

          const data = await res.json();
          console.log("Kết quả từ server:", data);

          alert("Đã lưu thành công!");
          loadDataForDate(selectedDate, searchTerm, selectedSession);
        } catch (error) {
          console.error(error);
          alert("Không thể lưu dữ liệu. Vui lòng thử lại.");
        }
      });
    });
  }
});
