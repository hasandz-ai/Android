/**
 * Personal Habit Tracker & Daily Task Scheduler - Core PWA Logic
 * Wireframe Layout Engine
 */

const STATE_KEY_TASKS = 'pts_tasks_v1';
const STATE_KEY_GAS_URL = 'pts_gas_url_v1';

let tasks = [];
let currentSelectedDate = getTodayDateString();
let gasWebAppUrl = '';
let deferredInstallPrompt = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initClockAndBanner();
  initPwaInstall();
  initEventListeners();
  renderApp();
});

// Format Date YYYY-MM-DD
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format Wireframe Date Header (DDDDD, DD-MM-YY) e.g. "RABU, 13-08-26"
function formatWireframeDateHeader(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  const dayName = days[dateObj.getDay()];
  const yy = year.slice(-2);
  
  return `${dayName}, ${day}-${month}-${yy}`;
}

// Format Full Human Date (e.g. "Selasa, 12-08-2026")
function formatFullHumanDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
  return `${dayName}, ${day}-${month}-${year}`;
}

// Initialize Local Storage & Demo Data
function initStorage() {
  const storedTasks = localStorage.getItem(STATE_KEY_TASKS);
  if (storedTasks) {
    try {
      tasks = JSON.parse(storedTasks);
    } catch (e) {
      console.error('Failed to parse local tasks:', e);
      tasks = getDemoTasks();
    }
  } else {
    tasks = getDemoTasks();
    saveTasksToStorage();
  }

  gasWebAppUrl = localStorage.getItem(STATE_KEY_GAS_URL) || '';
  const gasInput = document.getElementById('gas-url-input');
  if (gasInput) gasInput.value = gasWebAppUrl;
}

function saveTasksToStorage() {
  localStorage.setItem(STATE_KEY_TASKS, JSON.stringify(tasks));
}

// Demo Data
function getDemoTasks() {
  const today = getTodayDateString();
  return [
    {
      id: 'demo-1',
      name: "Sholat Subuh & Dzikir Pagi",
      category: "Ibadah",
      startTime: "04:30",
      endTime: "05:15",
      status: "Done",
      notes: "Di Masjid Jami'",
      date: today
    },
    {
      id: 'demo-2',
      name: "Jogging & Kalistenik Ringan",
      category: "Olahraga",
      startTime: "06:00",
      endTime: "06:45",
      status: "Done",
      notes: "Target 3km / 30 push-up",
      date: today
    },
    {
      id: 'demo-3',
      name: "Belajar Bahasa Inggris (Vocabulary)",
      category: "Kewajiban",
      startTime: "08:00",
      endTime: "09:00",
      status: "Done",
      notes: "Modul 4 Daily Tracker",
      date: today
    },
    {
      id: 'demo-4',
      name: "Briefing Tim & Eksekusi Project Utama",
      category: "Kewajiban",
      startTime: "09:30",
      endTime: "12:00",
      status: "Pending",
      notes: "Review fitur PWA & Google Sheets integration",
      date: today
    },
    {
      id: 'demo-5',
      name: "Sholat Dzuhur & Makan Siang Sehat",
      category: "Ibadah",
      startTime: "12:15",
      endTime: "13:00",
      status: "Pending",
      notes: "Jaga nutrisi & hidrasi",
      date: today
    },
    {
      id: 'demo-6',
      name: "Gaming & Relaxing",
      category: "Bermain",
      startTime: "16:30",
      endTime: "17:30",
      status: "Pending",
      notes: "Istirahat sore",
      date: today
    }
  ];
}

// ==========================================
// CLOCK, GREETING & ACTIVE BANNER ENGINE
// ==========================================
function initClockAndBanner() {
  updateClock();
  updateGreeting();
  updateActiveTaskBanner();
  
  setInterval(updateClock, 1000);
  setInterval(updateGreeting, 60000);
  setInterval(updateActiveTaskBanner, 5000);
}

function updateClock() {
  const now = new Date();
  const clockEl = document.getElementById('live-clock');
  const dateEl = document.getElementById('live-date');

  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
  }
  if (dateEl) {
    dateEl.textContent = formatFullHumanDate(getTodayDateString());
  }
}

function updateGreeting() {
  const greetingEl = document.getElementById('greeting-text');
  if (!greetingEl) return;

  const hour = new Date().getHours();
  let text = 'Selamat Datang! Siap mencapai target produktivitas Anda hari ini?';

  if (hour >= 4 && hour < 11) {
    text = 'Selamat Pagi! Awali hari dengan sholat, olahraga, dan rencana terstruktur.';
  } else if (hour >= 11 && hour < 15) {
    text = 'Selamat Siang! Tetap fokus pada prioritas tugas utama Anda hari ini.';
  } else if (hour >= 15 && hour < 18) {
    text = 'Selamat Sore! Selesaikan sisa target sebelum waktu istirahat.';
  } else if (hour >= 18 || hour < 4) {
    text = 'Selamat Malam! Evaluasi pencapaian hari ini & istirahat yang cukup.';
  }

  greetingEl.textContent = text;
}

// Active Task Banner (Card 2)
function updateActiveTaskBanner() {
  const bannerCard = document.getElementById('active-task-banner');
  const titleEl = document.getElementById('banner-title');
  const statusBadge = document.getElementById('banner-status-badge');
  const statusText = document.getElementById('banner-status-text');
  const durationText = document.getElementById('banner-countdown-text');
  const quickDoneBtn = document.getElementById('banner-quick-done');

  if (!bannerCard) return;

  const now = new Date();
  const currentHH = String(now.getHours()).padStart(2, '0');
  const currentMM = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHH}:${currentMM}`;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayStr = getTodayDateString();
  const todayTasks = tasks.filter(t => t.date === todayStr);

  // 1. Find active task
  let activeTask = todayTasks.find(t => {
    return t.startTime <= currentTimeStr && currentTimeStr < t.endTime && t.status !== 'Done';
  });

  if (activeTask) {
    bannerCard.className = 'wireframe-card active-banner-card is-active';
    titleEl.textContent = activeTask.name;
    statusText.textContent = activeTask.status === 'Pending' ? 'Active Now' : activeTask.status;

    const [endH, endM] = activeTask.endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    const remainingMin = endMinutes - currentMinutes;

    durationText.textContent = remainingMin > 0 ? `${remainingMin} menit (${activeTask.startTime} - ${activeTask.endTime})` : `Waktu Berakhir (${activeTask.startTime} - ${activeTask.endTime})`;
    
    if (quickDoneBtn) {
      quickDoneBtn.style.display = 'inline-flex';
      quickDoneBtn.onclick = () => {
        activeTask.status = 'Done';
        saveTasksToStorage();
        renderApp();
        showToast(`Tugas "${activeTask.name}" selesai!`, 'success');
      };
    }
    return;
  }

  // 2. Find next upcoming task today
  let upcomingTask = todayTasks
    .filter(t => t.startTime > currentTimeStr && t.status === 'Pending')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  if (upcomingTask) {
    bannerCard.className = 'wireframe-card active-banner-card';
    titleEl.textContent = upcomingTask.name;
    statusText.textContent = 'Upcoming';

    const [startH, startM] = upcomingTask.startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const diffMin = startMinutes - currentMinutes;

    durationText.textContent = `Mulai dalam ${diffMin} menit (${upcomingTask.startTime} - ${upcomingTask.endTime})`;
    if (quickDoneBtn) quickDoneBtn.style.display = 'none';
    return;
  }

  // 3. Idle / Free time
  bannerCard.className = 'wireframe-card active-banner-card';
  titleEl.textContent = 'Tidak Ada Aktivitas Aktif Saat Ini';
  statusText.textContent = 'Free Time';
  durationText.textContent = 'Semua jadwal tugas hari ini telah selesai atau belum dikonfigurasi.';
  if (quickDoneBtn) quickDoneBtn.style.display = 'none';
}

// ==========================================
// RENDER DAILY TASKS & SCHEDULER
// ==========================================
function renderApp() {
  renderDateNavigator();
  renderTasksList();
  renderStatistics();
  updateActiveTaskBanner();
}

function renderDateNavigator() {
  const dateLabel = document.getElementById('date-label');
  const datePicker = document.getElementById('date-picker-input');

  if (dateLabel) {
    dateLabel.textContent = formatWireframeDateHeader(currentSelectedDate);
  }
  if (datePicker) {
    datePicker.value = currentSelectedDate;
  }
}

function renderTasksList() {
  const wrapper = document.getElementById('task-items-wrapper');
  const emptyState = document.getElementById('empty-state');

  const categoryFilter = document.getElementById('filter-category').value;
  const statusFilter = document.getElementById('filter-status').value;

  let filtered = tasks.filter(t => t.date === currentSelectedDate);

  if (categoryFilter !== 'ALL') {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  if (statusFilter !== 'ALL') {
    filtered = filtered.filter(t => t.status === statusFilter);
  }

  filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (filtered.length === 0) {
    wrapper.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  wrapper.innerHTML = '';

  const now = new Date();
  const currentHH = String(now.getHours()).padStart(2, '0');
  const currentMM = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHH}:${currentMM}`;

  filtered.forEach(task => {
    const isActiveNow = currentSelectedDate === getTodayDateString() &&
      task.startTime <= currentTimeStr && currentTimeStr < task.endTime && task.status !== 'Done';

    const row = document.createElement('div');
    row.className = `task-table-row status-${task.status.toLowerCase()} ${isActiveNow ? 'active-now' : ''}`;

    const catClass = `cat-${task.category.toLowerCase()}`;

    row.innerHTML = `
      <div class="col-task">
        <span class="task-title">
          ${escapeHtml(task.name)}
          <button class="btn btn-ghost btn-sm" onclick="openEditTaskModal('${task.id}')" title="Edit" style="padding:2px 6px;">
            <i class="fa-solid fa-pen" style="font-size:11px;"></i>
          </button>
        </span>
      </div>

      <div class="col-category">
        <span class="cat-pill ${catClass}">${task.category}</span>
      </div>

      <div class="col-time">
        <span>${task.startTime} - ${task.endTime}</span>
      </div>

      <div class="col-status">
        <select class="form-select-sm" onchange="changeTaskStatus('${task.id}', this.value)">
          <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Done" ${task.status === 'Done' ? 'selected' : ''}>Done</option>
          <option value="Overdue" ${task.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
          <option value="Pass" ${task.status === 'Pass' ? 'selected' : ''}>Pass</option>
        </select>
        <button class="btn btn-ghost btn-sm" onclick="deleteTask('${task.id}')" title="Delete" style="padding:2px 6px; color:#ef4444;">
          <i class="fa-solid fa-trash-can" style="font-size:11px;"></i>
        </button>
      </div>
    `;

    wrapper.appendChild(row);
  });
}

function renderStatistics() {
  const dayTasks = tasks.filter(t => t.date === currentSelectedDate);
  const total = dayTasks.length;
  const done = dayTasks.filter(t => t.status === 'Done').length;
  const overdue = dayTasks.filter(t => t.status === 'Overdue').length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  const totalEl = document.getElementById('stat-total');
  const doneEl = document.getElementById('stat-done');
  const progressEl = document.getElementById('stat-progress');

  if (totalEl) totalEl.textContent = total;
  if (doneEl) doneEl.textContent = done;
  if (progressEl) progressEl.textContent = `${percentage}%`;
}

// ==========================================
// ACTIONS & MODALS
// ==========================================
function changeTaskStatus(taskId, newStatus) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = newStatus;
  saveTasksToStorage();
  renderApp();
  showToast(`Status diubah ke ${newStatus}`, 'info');
}

function deleteTask(taskId) {
  if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;

  tasks = tasks.filter(t => t.id !== taskId);
  saveTasksToStorage();
  renderApp();
  showToast('Tugas dihapus', 'warning');
}

function openAddTaskModal() {
  document.getElementById('modal-task-title').textContent = 'Tambah Task Baru';
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-modal').classList.remove('hidden');
}

function openEditTaskModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('modal-task-title').textContent = 'Edit Task';
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-name').value = task.name;
  document.getElementById('task-category').value = task.category;
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-start-time').value = task.startTime;
  document.getElementById('task-end-time').value = task.endTime;
  document.getElementById('task-notes').value = task.notes || '';

  document.getElementById('task-modal').classList.remove('hidden');
}

function handleSaveTask(e) {
  e.preventDefault();

  const id = document.getElementById('task-id').value;
  const name = document.getElementById('task-name').value.trim();
  const category = document.getElementById('task-category').value;
  const status = document.getElementById('task-status').value;
  const startTime = document.getElementById('task-start-time').value;
  const endTime = document.getElementById('task-end-time').value;
  const notes = document.getElementById('task-notes').value.trim();

  if (!name || !startTime || !endTime) {
    showToast('Harap isi semua bidang wajib (*)', 'error');
    return;
  }

  if (startTime >= endTime) {
    showToast('Jam selesai harus setelah jam mulai', 'error');
    return;
  }

  if (id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        name,
        category,
        status,
        startTime,
        endTime,
        notes
      };
      showToast('Task berhasil diperbarui!', 'success');
    }
  } else {
    const newTask = {
      id: 'task-' + Date.now(),
      name,
      category,
      status,
      startTime,
      endTime,
      notes,
      date: currentSelectedDate
    };
    tasks.push(newTask);
    showToast('Task baru ditambahkan!', 'success');
  }

  saveTasksToStorage();
  document.getElementById('task-modal').classList.add('hidden');
  renderApp();
}

// ==========================================
// GOOGLE SHEETS SYNC (PUSH & PULL)
// ==========================================
async function pushDataToGoogleSheets() {
  if (!gasWebAppUrl) {
    showToast('Google Apps Script URL belum diisi. Buka Settings.', 'warning');
    openSettingsModal();
    return;
  }

  showToast('Meng-upload data ke Google Sheets...', 'info');

  try {
    const payload = {
      action: 'upload_all',
      tasks: tasks,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(gasWebAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result && result.status === 'success') {
      showToast('Upload Sukses! Data tersimpan di Google Sheets.', 'success');
    } else {
      showToast(result.message || 'Upload selesai', 'success');
    }
  } catch (error) {
    console.error('GAS Push Error:', error);
    showToast('Gagal terhubung ke Google Sheets. Periksa URL Web App GAS.', 'error');
  }
}

async function pullDataFromGoogleSheets() {
  if (!gasWebAppUrl) {
    showToast('Google Apps Script URL belum diisi. Buka Settings.', 'warning');
    openSettingsModal();
    return;
  }

  showToast('Mengambil data dari Google Sheets...', 'info');

  try {
    const fetchUrl = `${gasWebAppUrl}?action=get_tasks&t=${Date.now()}`;
    const response = await fetch(fetchUrl);
    const result = await response.json();

    if (result && result.status === 'success' && Array.isArray(result.tasks)) {
      tasks = result.tasks;
      saveTasksToStorage();
      renderApp();
      showToast(`Download Sukses! ${tasks.length} task dimuat.`, 'success');
    } else {
      showToast('Data dari Google Sheets kosong.', 'warning');
    }
  } catch (error) {
    console.error('GAS Pull Error:', error);
    showToast('Gagal mendownload data dari Google Sheets.', 'error');
  }
}

function openSettingsModal() {
  document.getElementById('gas-url-input').value = gasWebAppUrl;
  document.getElementById('settings-modal').classList.remove('hidden');
}

function saveSettings() {
  const url = document.getElementById('gas-url-input').value.trim();
  gasWebAppUrl = url;
  localStorage.setItem(STATE_KEY_GAS_URL, gasWebAppUrl);
  document.getElementById('settings-modal').classList.add('hidden');
  showToast('Pengaturan tersimpan!', 'success');
}

function resetStorageData() {
  if (confirm('Reset seluruh cache lokal dan muat data demo?')) {
    localStorage.removeItem(STATE_KEY_TASKS);
    initStorage();
    renderApp();
    document.getElementById('settings-modal').classList.add('hidden');
    showToast('Data lokal di-reset.', 'info');
  }
}

// PWA
function initPwaInstall() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[PWA] SW registered:', reg.scope))
      .catch(err => console.error('[PWA] SW failed:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const desktopBtn = document.getElementById('sidebar-install-btn');
    const mobileBtn = document.getElementById('mobile-install-btn');
    if (desktopBtn) desktopBtn.classList.remove('hidden');
    if (mobileBtn) mobileBtn.classList.remove('hidden');
  });

  const installButtons = [
    document.getElementById('sidebar-install-btn'),
    document.getElementById('mobile-install-btn')
  ];

  installButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        deferredInstallPrompt = null;
      });
    }
  });
}

// Event Listeners
function initEventListeners() {
  document.getElementById('prev-day-btn').addEventListener('click', () => changeDate(-1));
  document.getElementById('next-day-btn').addEventListener('click', () => changeDate(1));
  document.getElementById('today-btn').addEventListener('click', () => {
    currentSelectedDate = getTodayDateString();
    renderApp();
  });

  const datePicker = document.getElementById('date-picker-input');
  datePicker.addEventListener('change', (e) => {
    if (e.target.value) {
      currentSelectedDate = e.target.value;
      renderApp();
    }
  });

  document.getElementById('filter-category').addEventListener('change', renderTasksList);
  document.getElementById('filter-status').addEventListener('change', renderTasksList);

  document.getElementById('add-task-btn').addEventListener('click', openAddTaskModal);

  document.getElementById('close-task-modal').addEventListener('click', () => {
    document.getElementById('task-modal').classList.add('hidden');
  });
  document.getElementById('cancel-task-btn').addEventListener('click', () => {
    document.getElementById('task-modal').classList.add('hidden');
  });
  document.getElementById('task-form').addEventListener('submit', handleSaveTask);

  document.getElementById('open-settings-btn').addEventListener('click', openSettingsModal);
  document.getElementById('sidebar-settings-btn').addEventListener('click', openSettingsModal);
  document.getElementById('close-settings-modal').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-storage-btn').addEventListener('click', resetStorageData);

  document.getElementById('quick-push-btn').addEventListener('click', pushDataToGoogleSheets);
  document.getElementById('quick-pull-btn').addEventListener('click', pullDataFromGoogleSheets);
  document.getElementById('sidebar-sync-btn').addEventListener('click', openSettingsModal);
  document.getElementById('push-data-btn').addEventListener('click', pushDataToGoogleSheets);
  document.getElementById('pull-data-btn').addEventListener('click', pullDataFromGoogleSheets);
}

function changeDate(daysOffset) {
  const [y, m, d] = currentSelectedDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + daysOffset);

  const newY = dateObj.getFullYear();
  const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
  const newD = String(dateObj.getDate()).padStart(2, '0');

  currentSelectedDate = `${newY}-${newM}-${newD}`;
  renderApp();
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-xmark';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
