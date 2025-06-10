document.addEventListener("DOMContentLoaded", () => {
  // Check authentication first
  auth.checkAuth();

  const calendar = document.getElementById("calendar");
  const calendarTitle = document.getElementById("calendar-title");
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  const modal = document.getElementById("updateModal");
  const closeModalBtn = document.getElementById("closeModal");
  const updateForm = document.getElementById("updateForm");
  const timeInputs = document.getElementById("timeInputs");
  const role = auth.getLocalStorageWithExpiry("role");
  const token = auth.getLocalStorageWithExpiry("token");
  const employeeIdRaw = auth.getLocalStorageWithExpiry("employeeId");
  const employeeId = employeeIdRaw ? parseInt(employeeIdRaw) : null;

  if (!employeeId) {
    console.error("employeeId không hợp lệ hoặc chưa được lưu trong localStorage");
    alert("Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.");
    auth.logout();
    return;
  }

  let selectedYear, selectedMonth, selectedDate;

  closeModalBtn.onclick = () => modal.style.display = "none";
  window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

  document.querySelectorAll('input[name="status"]').forEach(radio => {
    radio.addEventListener("change", () => {
      if (!timeInputs) return;

      if (radio.value === "Normal" && radio.checked) {
        timeInputs.style.display = "block";
      } else if (radio.checked) {
        timeInputs.style.display = "none";
        ["morningCheckIn", "morningCheckOut", "afternoonCheckIn", "afternoonCheckOut"].forEach(id => {
          const input = document.getElementById(id);
          if (input) input.value = "";
        });
      }
    });
  });

  function populateMonthYearSelectors() {
    for (let y = 2020; y <= 2030; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
    for (let m = 0; m < 12; m++) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = `Tháng ${m + 1}`;
      monthSelect.appendChild(opt);
    }
    const today = new Date();
    yearSelect.value = today.getFullYear();
    monthSelect.value = today.getMonth();
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = (`0${date.getMonth() + 1}`).slice(-2);
    const day = (`0${date.getDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
  }

  async function generateCalendar(year, month) {
    calendar.innerHTML = "";

    const apiUrl = `${API_BASE_URL}/TimeSkip/attendances/summary-employee?employeeId=${employeeId}&month=${month + 1}&year=${year}`;
    let attendanceData = [];
    try {
      const response = await fetch(apiUrl, { headers: { "Authorization": `Bearer ${token}` } });
      if (!response.ok) {
        console.error("API error:", response.status);
        alert(`Lỗi khi lấy dữ liệu chấm công: ${response.status}`);
        return;
      }
      const json = await response.json();
      attendanceData = Array.isArray(json.daily) ? json.daily
                     : Array.isArray(json) ? json
                     : (json.data || []);
    } catch (err) {
      console.error("Fetch failed:", err);
      alert("Lỗi kết nối API chấm công");
      return;
    }

    const daysOfWeek = ["Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    const grid = document.createElement("div");
    grid.className = "calendar-grid-inner";

    daysOfWeek.forEach(day => {
      const cell = document.createElement("div");
      cell.className = "calendar-cell header";
      cell.textContent = day;
      grid.appendChild(cell);
    });
    for (let i = 0; i < startDay; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "calendar-cell empty";
      grid.appendChild(emptyCell);
    }

    for (let date = 1; date <= daysInMonth; date++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell day";
      const currentDate = new Date(year, month, date);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0) cell.classList.add("sunday");

      const currentDateStr = formatDate(currentDate);
      const attendance = attendanceData.find(a => a.date === currentDateStr);

      let contentHtml = `<strong>${date}</strong><br>`;

      if (currentDate <= today) {
        if (dayOfWeek === 0) {
          contentHtml += `<span class="no-data">Chủ nhật</span>`;
        } else if (attendance && attendance.status === "Confirm") {
          if (attendance.selectedNote === "Leave") {
            contentHtml += `<span class="leave">Nghỉ phép (${attendance.leaveType === "Paid" ? "có lương" : "không lương"})</span>`;
          } else if (attendance.selectedNote === "Absent") {
            contentHtml += `<span class="absent">Nghỉ không phép</span>`;
          }
        } else if (attendance && (attendance.morningCheckIn || attendance.afternoonCheckIn)) {
          if (attendance.morningCheckIn || attendance.morningCheckOut) {
            contentHtml += `<span class="checkin">Sáng: ${attendance.morningCheckIn || ""} - ${attendance.morningCheckOut || ""}</span><br>`;
          }
          if (attendance.afternoonCheckIn || attendance.afternoonCheckOut) {
            contentHtml += `<span class="checkout">Chiều: ${attendance.afternoonCheckIn || ""} - ${attendance.afternoonCheckOut || ""}</span><br>`;
          }
          if (attendance.lateMinutes > 0) {
            contentHtml += `<span class="late">Đi muộn: ${attendance.lateMinutes} phút</span>`;
          }
        }
      }

      cell.innerHTML = contentHtml;

      if (currentDate <= today && dayOfWeek !== 0) {
        cell.style.cursor = "pointer";
        cell.addEventListener("click", () => {
          selectedYear = year;
          selectedMonth = month;
          selectedDate = date;

          modal.style.display = "flex";
          // document.querySelector('input[name="status"][value="Normal"]').checked = true;
          timeInputs.style.display = "block";

          ["morningCheckIn", "morningCheckOut", "afternoonCheckIn", "afternoonCheckOut"].forEach(id => {
            document.getElementById(id).value = attendance?.[id] || "";
          });
        });
      }

      grid.appendChild(cell);
    }

    calendar.appendChild(grid);
    calendarTitle.textContent = `BẢNG CHẤM CÔNG THÁNG ${month + 1}/${year}`;
  }

  updateForm.onsubmit = async (e) => {
    e.preventDefault();

    const selectedNote = document.querySelector('input[name="note"]:checked')?.value;
    if (!selectedNote) {
      alert("Vui lòng chọn trạng thái làm việc.");
      return;
    }

    if ([selectedYear, selectedMonth, selectedDate].some(v => typeof v !== 'number')) {
      alert("Chưa chọn ngày. Vui lòng chọn lại.");
      return;
    }

    const isoDate = formatDate(new Date(selectedYear, selectedMonth, selectedDate));

    const bodyData = {
      employeeId: employeeIdRaw,
      workDate: isoDate,
      note: selectedNote
    };

    try {
      const res = await fetch(`${API_BASE_URL}/WebApi/api/TimeSkip/submit-leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        alert("Cập nhật thành công!");
        document.getElementById("updateModal").style.display = "none";
        generateCalendar(selectedYear, selectedMonth);
      } else {
        alert("Lỗi cập nhật");
        console.error("Update error:", res.status, await res.text());
      }
    } catch (err) {
      alert("Lỗi kết nối API");
      console.error(err);
    }
  };

  monthSelect.addEventListener("change", () => generateCalendar(+yearSelect.value, +monthSelect.value));
  yearSelect.addEventListener("change", () => generateCalendar(+yearSelect.value, +monthSelect.value));

  populateMonthYearSelectors();
  generateCalendar(+yearSelect.value, +monthSelect.value);
});
