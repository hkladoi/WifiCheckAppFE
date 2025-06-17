document.addEventListener("DOMContentLoaded", () => {
  // Check authentication first
  // auth.checkAuth();

  const calendar = document.getElementById("calendar");
  const calendarTitle = document.getElementById("calendar-title");
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  const employeeSelect = document.getElementById("employee-select");
  const employeeSelectLabel = document.getElementById("employee-select-label");
  const modal = document.getElementById("updateModal");
  const closeModalBtn = document.getElementById("closeModal");
  const updateForm = document.getElementById("updateForm");
  const role = auth.getLocalStorageWithExpiry("role");
  const token = auth.getLocalStorageWithExpiry("token");
  const employeeIdRaw = auth.getLocalStorageWithExpiry("employeeId");
  const employeeId = employeeIdRaw ? parseInt(employeeIdRaw) : null;

  let selectedYear, selectedMonth, selectedDate, currentEmployeeId = employeeId;

  closeModalBtn.onclick = () => modal.style.display = "none";
  window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

  async function fetchAllEmployees() {
    if (role !== "Admin") {
      employeeSelect.style.display = "none";
      employeeSelectLabel.style.display = "none";
      return;
    }

    employeeSelect.style.display = "inline-block";
    employeeSelectLabel.style.display = "inline-block";

    try {
      const response = await fetch(`${API_BASE_URL}/Admin/GetAllEmployee`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        console.error("API error fetching employees:", response.status);
        showToast(`Lỗi khi lấy danh sách nhân viên: ${response.status}`, 'error');
        return;
      }

      const employees = await response.json();
      employeeSelect.innerHTML = ""; 

      employees.forEach(emp => {
        const opt = document.createElement("option");
        opt.value = emp.employeeId;
        opt.textContent = emp.fullName;
        employeeSelect.appendChild(opt);
      });

      if (employeeId) {
        employeeSelect.value = employeeId;
      }
      currentEmployeeId = +employeeSelect.value; 
    } catch (err) {
      console.error("Fetch employees failed:", err);
      showToast("Lỗi kết nối API lấy danh sách nhân viên", 'error');
    }
  }

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

  async function generateCalendar(year, month, empId) {
    calendar.innerHTML = "";

    const targetEmployeeId = empId || currentEmployeeId;

    const apiUrl = `${API_BASE_URL}/TimeSkip/attendances/summary-employee?employeeId=${targetEmployeeId}&month=${month + 1}&year=${year}`;
    let attendanceData = [];
    try {
      const response = await fetch(apiUrl, { 
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        } 
      });
      if (!response.ok) {
        console.error("API error:", response.status);
        showToast(`Lỗi khi lấy dữ liệu chấm công: ${response.status}`, 'error');
        return;
      }
      const json = await response.json();
      attendanceData = Array.isArray(json.daily) ? json.daily
                     : Array.isArray(json) ? json
                     : (json.data || []);
    } catch (err) {
      console.error("Fetch failed:", err);
      showToast("Lỗi kết nối API chấm công", 'error');
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
      showToast("Vui lòng chọn trạng thái làm việc.", 'error');
      return;
    }

    if ([selectedYear, selectedMonth, selectedDate].some(v => typeof v !== 'number')) {
      showToast("Chưa chọn ngày. Vui lòng chọn lại.", 'error');
      return;
    }

    const isoDate = formatDate(new Date(selectedYear, selectedMonth, selectedDate));
    const token = auth.getLocalStorageWithExpiry('token');

    let bodyData = {
      employeeId: currentEmployeeId,
      workDate: isoDate,
      note: selectedNote 
    };

    let apiUrl = `${API_BASE_URL}/LeaveRequest/submit-leave`; 
    let requestMethod = "POST";

    try {
      const res = await fetch(apiUrl, {
        method: requestMethod,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        showToast("Cập nhật thành công!", 'success');
        document.getElementById("updateModal").style.display = "none";
        generateCalendar(selectedYear, selectedMonth, currentEmployeeId);
      } else {
        showToast("Lỗi cập nhật", 'error');
        console.error("Update error:", res.status, await res.text());
      }
    } catch (err) {
      showToast("Lỗi kết nối API", 'error');
      console.error(err);
    }
  };

  monthSelect.addEventListener("change", () => generateCalendar(+yearSelect.value, +monthSelect.value, currentEmployeeId));
  yearSelect.addEventListener("change", () => generateCalendar(+yearSelect.value, +monthSelect.value, currentEmployeeId));
  employeeSelect.addEventListener("change", () => {
    currentEmployeeId = +employeeSelect.value;
    generateCalendar(+yearSelect.value, +monthSelect.value, currentEmployeeId);
  });

  populateMonthYearSelectors();
  fetchAllEmployees();
  generateCalendar(+yearSelect.value, +monthSelect.value, currentEmployeeId);
});

// Toast notification function
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
