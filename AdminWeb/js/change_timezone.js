document.addEventListener("DOMContentLoaded", () => {
  // Check authentication first
  auth.checkAuth();

  const tbody = document.getElementById("days-body");
  const userId = auth.getLocalStorageWithExpiry("userId");
  const selectedDateInput = document.getElementById("date");
  const searchButton = document.getElementById("search-button");
  const searchInput = document.getElementById("search-name");

  let searchTerm = ""; // ✅ Khai báo sớm để tránh lỗi ReferenceError

  if (!userId) {
    alert("Bạn chưa đăng nhập!");
    auth.logout();
    return;
  }

  console.log("UserID:", userId);

  // --- 1. Khi trang load, tự động lấy ngày mới nhất ---
try {
  // Lấy ngày hiện tại và format theo định dạng YYYY-MM-DD
  const latestDate = new Date().toISOString().split('T')[0];
  
  selectedDateInput.value = latestDate;
  loadDataForDate(latestDate, searchTerm);
} catch (err) {
  console.error(err);
  // alert("Không thể lấy ngày hiện tại.");
}

  // --- 2. Khi chọn ngày khác, tải lại dữ liệu ---
  selectedDateInput.addEventListener("change", () => {
    const selectedDate = selectedDateInput.value;
    if (selectedDate) {
      loadDataForDate(selectedDate, searchTerm);
    }
  });

  // --- 3. Search ---
  searchButton.addEventListener("click", () => {
    searchTerm = searchInput.value.trim().toLowerCase(); // ✅ Cập nhật biến searchTerm toàn cục
    const selectedDate = selectedDateInput.value;

    if (!selectedDate) {
      alert("Vui lòng chọn ngày trước khi tìm kiếm.");
      return;
    }

    loadDataForDate(selectedDate, searchTerm);
  });

  // --- Hàm chính để gọi API lấy dữ liệu chấm công và vẽ bảng ---
  function loadDataForDate(date, searchTerm = "") {
    fetch(`https://vinashootapi.live/WebApi/api/TimeSkip/by-date?date=${date}`)
      .then(res => {
        if (!res.ok) throw new Error("Lỗi khi tải dữ liệu");
        return res.json();
      })
      .then(data => {
        tbody.innerHTML = "";

        const filtered = searchTerm
          ? data.filter(row => row.employeeName.toLowerCase().includes(searchTerm))
          : data;

        filtered.forEach(row => {
          const tr = document.createElement("tr");
          tr.dataset.employeeId = row.employeeId;
          tr.dataset.attendanceIdMorning = row.attendanceIdMorning ?? "";
          tr.dataset.attendanceIdAfternoon = row.attendanceIdAfternoon ?? "";

          tr.innerHTML = `
            <td>${row.stt}</td>
            <td>${row.employeeName}</td>
            <td><input type="time" class="check-in-morning"    value="${row.checkInMorning || ""}"    /></td>
            <td><input type="time" class="check-out-morning"   value="${row.checkOutMorning || ""}"   /></td>
            <td><input type="time" class="check-in-afternoon"  value="${row.checkInAfternoon || ""}"  /></td>
            <td><input type="time" class="check-out-afternoon" value="${row.checkOutAfternoon || ""}" /></td>
            <td><textarea class="notes" readonly>${row.notes || ""}</textarea></td>
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
        const attendanceIdMorning = row.dataset.attendanceIdMorning;
        const attendanceIdAfternoon = row.dataset.attendanceIdAfternoon;

        const checkInMorning    = row.querySelector(".check-in-morning").value;
        const checkOutMorning   = row.querySelector(".check-out-morning").value;
        const checkInAfternoon  = row.querySelector(".check-in-afternoon").value;
        const checkOutAfternoon = row.querySelector(".check-out-afternoon").value;
        const reason            = row.querySelector(".reason").value?.trim();

        const payloads = [];

        if (checkInMorning || checkOutMorning || reason) {
          if (attendanceIdMorning) {
            payloads.push({
              attendanceId: Number(attendanceIdMorning),
              checkInTime: checkInMorning ? `${selectedDate}T${checkInMorning}:00` : null,
              checkOutTime: checkOutMorning ? `${selectedDate}T${checkOutMorning}:00` : null,
              reason: reason || "",
              performedBy
            });
          } else {
            payloads.push({
              employeeId:  Number(employeeId),
              sessionId:   1,
              workDate:    selectedDate,
              checkInTime:  checkInMorning ? `${selectedDate}T${checkInMorning}:00` : null,
              checkOutTime: checkOutMorning ? `${selectedDate}T${checkOutMorning}:00` : null,
              reason:      reason || "",
              performedBy
            });
          }
        }

        if (checkInAfternoon || checkOutAfternoon || reason) {
          if (attendanceIdAfternoon) {
            payloads.push({
              attendanceId: Number(attendanceIdAfternoon),
              checkInTime: checkInAfternoon ? `${selectedDate}T${checkInAfternoon}:00` : null,
              checkOutTime: checkOutAfternoon ? `${selectedDate}T${checkOutAfternoon}:00` : null,
              reason: reason || "",
              performedBy
            });
          } else {
            payloads.push({
              employeeId:  Number(employeeId),
              sessionId:   2,
              workDate:    selectedDate,
              checkInTime:  checkInAfternoon ? `${selectedDate}T${checkInAfternoon}:00` : null,
              checkOutTime: checkOutAfternoon ? `${selectedDate}T${checkOutAfternoon}:00` : null,
              reason:      reason || "",
              performedBy
            });
          }
        }

        if (payloads.length === 0) {
          alert("Không có dữ liệu nào để lưu.");
          return;
        }

        try {
          for (const payload of payloads) {
            const res = await fetch("https://vinashootapi.live/WebApi/api/TimeSkip/adjust", {
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
          }

          alert("Đã lưu thành công!");
          loadDataForDate(selectedDate, searchTerm);
        } catch (error) {
          console.error(error);
          alert("Không thể lưu dữ liệu. Vui lòng thử lại.");
        }
      });
    });
  }
});
