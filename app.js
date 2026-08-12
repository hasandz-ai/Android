/**
 * Personal Habit Tracker & Daily Task Scheduler - Core PWA Logic
 */

// Global State
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

// Format Human Date (e.g. "Rabu, 12 Agustus 2026")
function formatHumanDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(year, parseInt(month) - 1, day);
  return dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
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
    // Generate initial demo tasks for today
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

// Initial Demo Tasks
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
      name: "Belajar Bahasa Inggris (Vocabulary & Listening)",
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
// CLOCK & REAL-TIME ACTIVE TASK BANNER ENGINE (FITUR A)
// ==========================================
function initClockAndBanner() {
  updateClock();
  updateActiveTaskBanner();
  
  // Real-time tick every 1s for clock, 5s for active banner check
  setInterval(updateClock, 1000);
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
    dateEl.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}

// Core Logic: Real-time Active Task Banner
function updateActiveTaskBanner() {
  const banner = document.getElementById('active-task-banner');
  const tag = document.getElementById('banner-tag');
  const category = document.getElementById('banner-category');
  const title = document.getElementById('banner-title');
  const time = document.getElementById('banner-time');
  const countdown = document.getElementById('banner-countdown');
  const actionBox = document.getElementById('banner-action-box');
  const quickDoneBtn = document.getElementById('banner-quick-done');

  if (!banner) return;

  const now = new Date();
  const currentHH = String(now.getHours()).padStart(2, '0');
  const currentMM = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHH}:${currentMM}`;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayStr = getTodayDateString();
  const todayTasks = tasks.filter(t => t.date === todayStr);

  // 1. Find task currently inside Time Estimate range (startTime <= currentTime < endTime)
  let activeTask = todayTasks.find(t => {
    return t.startTime <= currentTimeStr && currentTimeStr < t.endTime && t.status !== 'Done';
  });

  if (activeTask) {
    // ACTIVE TASK NOW FOUND
    banner.className = 'active-task-banner is-active';
    tag.textContent = 'SEDANG BERLANGSUNG';
    category.textContent = activeTask.category;
    title.textContent = activeTask.name;
    time.innerHTML = `<i class="fa-regular fa-clock"></i> ${activeTask.startTime} - ${activeTask.endTime}`;

    const [endH, endM] = activeTask.endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    const remainingMin = endMinutes - currentMinutes;

    countdown.textContent = remainingMin > 0 ? `Sisa waktu: ${remainingMin} menit` : 'Waktu berakhir';
    actionBox.classList.remove('hidden');

    quickDoneBtn.onclick = () => {
      activeTask.status = 'Done';
      saveTasksToStorage();
      renderApp();
      showToast(`Tugas "${activeTask.name}" selesai!`, 'success');
    };
    return;
  }

  // 2. Check for next upcoming task today
  let upcomingTask = todayTasks
    .filter(t => t.startTime > currentTimeStr && t.status === 'Pending')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  if (upcomingTask) {
    banner.className = 'active-task-banner';
    tag.textContent = 'TUGAS BERIKUTNYA';
    category.textContent = upcomingTask.category;
    title.textContent = upcomingTask.name;
    time.innerHTML = `<i class="fa-regular fa-clock"></i> ${upcomingTask.startTime} - ${upcomingTask.endTime}`;

    const [startH, startM] = upcomingTask.startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const diffMin = startMinutes - currentMinutes;

    countdown.textContent = `Mulai dalam ${diffMin} menit`;
    actionBox.classList.add('hidden');
    return;
  }

  // 3. No active or upcoming task remaining today
  banner.className = 'active-task-banner is-idle';
  tag.textContent = 'STATUS KOSONG';
  category.textContent = 'Istirahat';
  title.textContent = 'Tidak Ada Tugas Aktif Saat Ini';
  time.innerHTML = `<i class="fa-regular fa-clock"></i> Free Time`;
  countdown.textContent = 'Semua jadwal tugas hari ini telah selesai atau belum dikonfigurasi.';
  actionBox.classList.add('hidden');
}

// ==========================================
// RENDER DAILY TASKS SCHEDULER & STATS (FITUR B)
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

  const todayStr = getTodayDateString();
  if (currentSelectedDate === todayStr) {
    dateLabel.textContent = `Hari Ini (${formatHumanDate(currentSelectedDate)})`;
  } else {
    dateLabel.textContent = formatHumanDate(currentSelectedDate);
  }

  if (datePicker) datePicker.value = currentSelectedDate;
}

function renderTasksList() {
  const wrapper = document.getElementById('task-items-wrapper');
  const emptyState = document.getElementById('empty-state');
  const countBadge = document.getElementById('task-count-text');

  const categoryFilter = document.getElementById('filter-category').value;
  const statusFilter = document.getElementById('filter-status').value;

  // Filter tasks for current date and category/status filters
  let filtered = tasks.filter(t => t.date === currentSelectedDate);

  if (categoryFilter !== 'ALL') {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  if (statusFilter !== 'ALL') {
    if (statusFilter === 'Pending') {
      filtered = filtered.filter(t => t.status === 'Pending');
    } else {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
  }

  // Sort by startTime
  filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));

  countBadge.textContent = `${filtered.length} tugas`;

  if (filtered.length === 0) {
    wrapper.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  wrapper.innerHTML = '';

  const now = new Date();
  const currentHH = String(now.getHours()).padStart(2, '0');
  const currentMM = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHH}:${currentMM}`;

  filtered.forEach(task => {
    const isActiveNow = currentSelectedDate === getTodayDateString() &&
      task.startTime <= currentTimeStr && currentTimeStr < task.endTime && task.status !== 'Done';

    const card = document.createElement('div');
    card.className = `task-item-card status-${task.status.toLowerCase()} ${isActiveNow ? 'active-now' : ''}`;

    const catClass = `cat-${task.category.toLowerCase()}`;

    card.innerHTML = `
      <button class="task-status-btn" onclick="toggleTaskStatus('${task.id}')" title="Klik untuk ubah status">
        <i class="fa-solid fa-check"></i>
      </button>

      <div class="task-main-info">
        <div class="task-title-row">
          <span class="task-title">${escapeHtml(task.name)}</span>
          <span class="task-category-pill ${catClass}">${task.category}</span>
          ${isActiveNow ? '<span class="banner-tag" style="font-size:10px; color:#10b981;">● Active Now</span>' : ''}
        </div>
        <div class="task-meta-row">
          <span class="task-time-badge"><i class="fa-regular fa-clock"></i> ${task.startTime} - ${task.endTime}</span>
          ${task.notes ? `<span class="task-notes-snippet"><i class="fa-regular fa-note-sticky"></i> ${escapeHtml(task.notes)}</span>` : ''}
        </div>
      </div>

      <div class="task-actions">
        <select class="status-dropdown-select" onchange="changeTaskStatus('${task.id}', this.value)">
          <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Done" ${task.status === 'Done' ? 'selected' : ''}>Done</option>
          <option value="Overdue" ${task.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
          <option value="Pass" ${task.status === 'Pass' ? 'selected' : ''}>Pass</option>
        </select>

        <button class="btn btn-icon btn-ghost" onclick="openEditTaskModal('${task.id}')" title="Edit Tugas">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>

        <button class="btn btn-icon btn-ghost" onclick="deleteTask('${task.id}')" title="Hapus Tugas">
          <i class="fa-solid fa-trash-can" style="color:#ef4444;"></i>
        </button>
      </div>
    `;

    wrapper.appendChild(card);
  });
}

function renderStatistics() {
  const dayTasks = tasks.filter(t => t.date === currentSelectedDate);
  const total = dayTasks.length;
  const done = dayTasks.filter(t => t.status === 'Done').length;
  const overdue = dayTasks.filter(t => t.status === 'Overdue').length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-overdue').textContent = overdue;
  document.getElementById('stat-progress').textContent = `${percentage}%`;
}

// ==========================================
// TASK ACTIONS (ADD / EDIT / DELETE / STATUS)
// ==========================================
function toggleTaskStatus(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.status === 'Done') {
    task.status = 'Pending';
  } else {
    task.status = 'Done';
  }

  saveTasksToStorage();
  renderApp();
  showToast(`Status tugas diperbarui ke ${task.status}`, 'info');
}

function changeTaskStatus(taskId, newStatus) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = newStatus;
  saveTasksToStorage();
  renderApp();
  showToast(`Status tugas diubah ke ${newStatus}`, 'info');
}

function deleteTask(taskId) {
  if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;

  tasks = tasks.filter(t => t.id !== taskId);
  saveTasksToStorage();
  renderApp();
  showToast('Tugas berhasil dihapus', 'warning');
}

function openAddTaskModal() {
  document.getElementById('modal-task-title').textContent = 'Tambah Tugas Harian Baru';
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-modal').classList.remove('hidden');
}

function openEditTaskModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('modal-task-title').textContent = 'Edit Tugas Harian';
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
    showToast('Harap isi semua bidang yang wajib (*)', 'error');
    return;
  }

  if (startTime >= endTime) {
    showToast('Jam selesai harus setelah jam mulai', 'error');
    return;
  }

  if (id) {
    // Edit existing task
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
      showToast('Tugas berhasil diperbarui!', 'success');
    }
  } else {
    // Create new task
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
    showToast('Tugas baru berhasil ditambahkan!', 'success');
  }

  saveTasksToStorage();
  document.getElementById('task-modal').classList.add('hidden');
  renderApp();
}

// ==========================================
// GOOGLE SHEETS BACKEND SYNC ENGINE (UPLOAD & DOWNLOAD)
// ==========================================
async function pushDataToGoogleSheets() {
  if (!gasWebAppUrl) {
    showToast('Google Apps Script Web App URL belum diisi. Buka Settings untuk mengonfigurasi.', 'warning');
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
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
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
    showToast('Google Apps Script Web App URL belum diisi. Buka Settings untuk mengonfigurasi.', 'warning');
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
      showToast(`Download Sukses! ${tasks.length} tugas dimuat dari Google Sheets.`, 'success');
    } else {
      showToast('Data dari Google Sheets kosong atau format tidak sesuai.', 'warning');
    }
  } catch (error) {
    console.error('GAS Pull Error:', error);
    showToast('Gagal mendownload data dari Google Sheets. Pastikan Web App GAS sudah di-deploy dengan akses "Anyone".', 'error');
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
  showToast('Pengaturan backend tersimpan!', 'success');
}

function resetStorageData() {
  if (confirm('Apakah Anda yakin ingin menghapus seluruh cache lokal dan memuat ulang data demo?')) {
    localStorage.removeItem(STATE_KEY_TASKS);
    initStorage();
    renderApp();
    document.getElementById('settings-modal').classList.add('hidden');
    showToast('Data lokal berhasil di-reset ke data demo.', 'info');
  }
}

// ==========================================
// PWA SERVICE WORKER & INSTALL PROMPT LOGIC
// ==========================================
function initPwaInstall() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch(err => console.error('[PWA] Service Worker registration failed:', err));
  }

  // Intercept beforeinstallprompt event
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
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log('[PWA] User response to install prompt:', outcome);
        deferredInstallPrompt = null;
        if (desktopBtn) desktopBtn.classList.add('hidden');
        if (mobileBtn) mobileBtn.classList.add('hidden');
      });
    }
  });
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function initEventListeners() {
  // Date Navigator Controls
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

  // Filter Event Listeners
  document.getElementById('filter-category').addEventListener('change', renderTasksList);
  document.getElementById('filter-status').addEventListener('change', renderTasksList);

  // Add Task Buttons
  document.getElementById('add-task-btn').addEventListener('click', openAddTaskModal);
  document.getElementById('empty-add-btn').addEventListener('click', openAddTaskModal);
  const mobileQuickAdd = document.getElementById('mobile-quick-add');
  if (mobileQuickAdd) mobileQuickAdd.addEventListener('click', openAddTaskModal);

  // Modal Controls
  document.getElementById('close-task-modal').addEventListener('click', () => {
    document.getElementById('task-modal').classList.add('hidden');
  });
  document.getElementById('cancel-task-btn').addEventListener('click', () => {
    document.getElementById('task-modal').classList.add('hidden');
  });
  document.getElementById('task-form').addEventListener('submit', handleSaveTask);

  // Settings & Sync Controls
  document.getElementById('open-settings-btn').addEventListener('click', openSettingsModal);
  document.getElementById('sidebar-settings-btn').addEventListener('click', openSettingsModal);
  document.getElementById('close-settings-modal').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-storage-btn').addEventListener('click', resetStorageData);

  // Quick Push / Pull Buttons
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

// Toast System
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
  }, 3500);
}

// Utility: HTML Escaping
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
