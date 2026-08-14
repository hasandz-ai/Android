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
// HAPTIC FEEDBACK ENGINE & TUNING CONFIG
// ==========================================
// Easily tune haptic duration, patterns, and debounce thresholds here:
const HAPTIC_CONFIG = {
  enabled: true,
  debounceMs: 35, // Preventive threshold blocking unwanted double vibrations
};

// Haptic Vibration Patterns (Tunable Presets)
const HAPTIC_PRESETS = {
  click: 12,                  // Short solid click for buttons & selections (User preferred)
  heavyClick: 24,             // Firmer click for save/delete actions
  snap: 10,                   // Ultra-crisp tick for wheel scrolling
  holdSuccess: [15, 30, 20],   // Pulse pattern for long-press hold gesture
};

let lastHapticTimestamp = 0;

/**
 * Centralized Haptic Trigger with Preventive Double-Vibration Guard
 * @param {string|number|number[]} pattern - Preset key or custom ms duration/pattern
 */
function triggerHaptic(pattern = 'click') {
  if (!HAPTIC_CONFIG.enabled || !('vibrate' in navigator)) return;

  const now = Date.now();
  // Preventive Guard: Block unwanted double vibrations within debounceMs threshold
  if (now - lastHapticTimestamp < HAPTIC_CONFIG.debounceMs) {
    return;
  }
  lastHapticTimestamp = now;

  try {
    let vibePattern = HAPTIC_PRESETS.click;
    if (typeof pattern === 'string' && HAPTIC_PRESETS[pattern] !== undefined) {
      vibePattern = HAPTIC_PRESETS[pattern];
    } else if (typeof pattern === 'number' || Array.isArray(pattern)) {
      vibePattern = pattern;
    }
    navigator.vibrate(vibePattern);
  } catch (e) {
    // Ignore browser permission restrictions
  }
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initClockAndBanner();
  initPwaInstall();
  initEventListeners();
  initStickyBannerScroll();
  renderApp();
  autoScrollToActiveTask();
});

// Format Date YYYY-MM-DD
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format Date Header (DDDDD, DD/MM/YY) e.g. "THURSDAY, 13/08/26"
function formatWireframeDateHeader(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = days[dateObj.getDay()];
  const yy = year.slice(-2);

  return `${dayName}, ${day}/${month}/${yy}`;
}

// Format Full Human Date (DDDDD, DD/MM/YY)
function formatFullHumanDate(dateStr) {
  return formatWireframeDateHeader(dateStr);
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

// Demo Data (English Defaults)
function getDemoTasks() {
  const today = getTodayDateString();
  return [
    {
      id: 'demo-1',
      name: "Morning Prayer & Meditation",
      category: "Worship",
      startTime: "04:30",
      endTime: "05:15",
      status: "Done",
      notes: "Daily morning routine",
      date: today
    },
    {
      id: 'demo-2',
      name: "Light Calisthenics & Jogging",
      category: "Exercise",
      startTime: "06:00",
      endTime: "06:45",
      status: "Done",
      notes: "Target 3km / 30 push-ups",
      date: today
    },
    {
      id: 'demo-3',
      name: "English Vocabulary Study",
      category: "Must Do",
      startTime: "08:00",
      endTime: "09:00",
      status: "Done",
      notes: "Module 4 Daily Tracker",
      date: today
    },
    {
      id: 'demo-4',
      name: "Team Sync & Project Execution",
      category: "Must Do",
      startTime: "09:30",
      endTime: "12:00",
      status: "Pending",
      notes: "Review PWA features & Google Sheets integration",
      date: today
    },
    {
      id: 'demo-5',
      name: "Noon Prayer & Healthy Lunch",
      category: "Worship",
      startTime: "12:15",
      endTime: "13:00",
      status: "Pending",
      notes: "Stay hydrated & eat well",
      date: today
    },
    {
      id: 'demo-6',
      name: "Gaming & Relaxation",
      category: "Play",
      startTime: "16:30",
      endTime: "17:30",
      status: "Pending",
      notes: "Afternoon break",
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
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    clockEl.innerHTML = `${hh}:${mm}<span class="clock-seconds">:${ss}</span>`;
  }
  if (dateEl) {
    dateEl.textContent = formatFullHumanDate(getTodayDateString());
  }
}

function updateGreeting() {
  const greetingEl = document.getElementById('greeting-text');
  if (!greetingEl) return;

  const hour = new Date().getHours();
  let text = 'Welcome! Ready to achieve your productivity goals today?';

  if (hour >= 4 && hour < 11) {
    text = 'Good Morning! Start your day structured and focused.';
  } else if (hour >= 11 && hour < 15) {
    text = 'Good Afternoon! Stay focused on your primary task priorities.';
  } else if (hour >= 15 && hour < 18) {
    text = 'Good Evening! Wrap up remaining goals before break time.';
  } else if (hour >= 18 || hour < 4) {
    text = 'Good Night! Review today\'s achievements & rest well.';
  }

  greetingEl.textContent = text;
}

// Active Task Banner (Card 2)
function updateActiveTaskBanner() {
  const bannerCard = document.getElementById('active-task-banner');
  const titleEl = document.getElementById('banner-title');
  const statusBadge = document.getElementById('banner-status-badge');
  const statusText = document.getElementById('banner-status-text');
  const durationContainer = document.getElementById('banner-duration');
  const quickDoneBtn = document.getElementById('banner-quick-done');
  const headerTitleEl = bannerCard ? bannerCard.querySelector('.banner-header-title') : null;

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
    bannerCard.className = 'flat-section active-banner-section is-active';
    if (headerTitleEl) headerTitleEl.textContent = 'Right now you should be :';
    titleEl.textContent = activeTask.name;
    if (statusText) statusText.textContent = activeTask.status === 'Pending' ? 'Active Now' : activeTask.status;

    const [endH, endM] = activeTask.endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    const remainingMin = endMinutes - currentMinutes;

    const remainingText = remainingMin > 0 ? `${remainingMin} minutes left (${activeTask.startTime} - ${activeTask.endTime})` : `Time Ended (${activeTask.startTime} - ${activeTask.endTime})`;
    if (durationContainer) {
      durationContainer.innerHTML = `<span class="banner-duration-label"><i class="fa-regular fa-clock"></i> Duration left:</span><span id="banner-countdown-text">${remainingText}</span>`;
    }

    if (quickDoneBtn) {
      quickDoneBtn.style.display = 'inline-flex';
      quickDoneBtn.onclick = () => {
        triggerHaptic('heavyClick');
        activeTask.status = 'Done';
        saveTasksToStorage();
        renderApp();
        showToast(`Task "${activeTask.name}" completed!`, 'success');
      };
    }
    return;
  }

  // 2. Find next upcoming task today
  let upcomingTask = todayTasks
    .filter(t => t.startTime > currentTimeStr && t.status === 'Pending')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  if (upcomingTask) {
    bannerCard.className = 'flat-section active-banner-section';
    if (headerTitleEl) headerTitleEl.textContent = 'Upcoming activities :';
    titleEl.textContent = upcomingTask.name;
    if (statusText) statusText.textContent = 'Upcoming';

    const [startH, startM] = upcomingTask.startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const diffMin = startMinutes - currentMinutes;

    const upcomingText = `Starts in ${diffMin} minutes (${upcomingTask.startTime} - ${upcomingTask.endTime})`;
    if (durationContainer) {
      durationContainer.innerHTML = `<span class="banner-duration-label"><i class="fa-regular fa-clock"></i> Duration left:</span><span id="banner-countdown-text">${upcomingText}</span>`;
    }
    if (quickDoneBtn) quickDoneBtn.style.display = 'none';
    return;
  }

  // 3. Idle / Free time (No Active & No Upcoming Task)
  bannerCard.className = 'flat-section active-banner-section';
  if (headerTitleEl) headerTitleEl.textContent = 'Upcoming activities :';
  titleEl.textContent = 'No More Activity';
  if (statusText) statusText.textContent = 'Free Time';
  if (durationContainer) {
    durationContainer.innerHTML = `<span id="banner-countdown-text">All tasks for today are completed or not scheduled yet.</span>`;
  }
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
  const todayStr = getTodayDateString();
  const isToday = (currentSelectedDate === todayStr);

  if (dateLabel) {
    dateLabel.textContent = isToday ? 'TODAY' : formatWireframeDateHeader(currentSelectedDate);
  }

  if (datePicker) {
    datePicker.value = currentSelectedDate;
    if (isToday) {
      datePicker.disabled = true;
      datePicker.style.pointerEvents = 'none';
    } else {
      datePicker.disabled = false;
      datePicker.style.pointerEvents = 'auto';
    }
  }
}

function renderTasksList() {
  const wrapper = document.getElementById('task-items-wrapper');
  const emptyState = document.getElementById('empty-state');

  const catEl = document.getElementById('filter-category');
  const statEl = document.getElementById('filter-status');
  const categoryFilter = catEl ? catEl.value : 'ALL';
  const statusFilter = statEl ? statEl.value : 'ALL';

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
      <div class="swipe-indicator swipe-edit"><i class="fa-solid fa-pen"></i> Edit</div>
      <div class="swipe-indicator swipe-delete"><i class="fa-solid fa-trash-can"></i> Hapus</div>

      <div class="col-task">
        <span class="task-title-text">${escapeHtml(task.name)}</span>
      </div>

      <div class="col-category">
        <span class="cat-pill ${catClass}">${task.category}</span>
      </div>

      <div class="col-time">
        <span>${task.startTime} - ${task.endTime}</span>
      </div>

      <div class="col-status">
        <select class="form-select-sm task-status-select status-val-${task.status.toLowerCase()}" onchange="changeTaskStatus('${task.id}', this.value)">
          <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Done" ${task.status === 'Done' ? 'selected' : ''}>Done</option>
          <option value="Overdue" ${task.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
          <option value="Pass" ${task.status === 'Pass' ? 'selected' : ''}>Pass</option>
        </select>
      </div>
    `;

    initSwipeGestures(row, task.id);
    wrapper.appendChild(row);
  });
}

// Touch Swipe Gestures (Swipe Right to Edit, Swipe Left to Delete)
function initSwipeGestures(rowEl, taskId) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isSwiping = false;
  let thresholdTriggered = false;

  rowEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = false;
    thresholdTriggered = false;
    rowEl.style.transition = 'none';
  }, { passive: true });

  rowEl.addEventListener('touchmove', (e) => {
    const diffX = e.touches[0].clientX - startX;
    const diffY = e.touches[0].clientY - startY;

    if (!isSwiping && Math.abs(diffY) > Math.abs(diffX)) return;

    if (Math.abs(diffX) > 10) {
      isSwiping = true;
      currentX = diffX;
      const clampedX = Math.max(-120, Math.min(120, diffX));
      rowEl.style.transform = `translateX(${clampedX}px)`;

      if (clampedX > 25) {
        rowEl.classList.add('swiping-right');
        rowEl.classList.remove('swiping-left');
      } else if (clampedX < -25) {
        rowEl.classList.add('swiping-left');
        rowEl.classList.remove('swiping-right');
      } else {
        rowEl.classList.remove('swiping-right', 'swiping-left');
      }

      // Vibration Stage 1: Trigger vibration when swipe threshold (65px) is crossed
      if (Math.abs(clampedX) >= 65 && !thresholdTriggered) {
        thresholdTriggered = true;
        triggerHaptic('snap');
      } else if (Math.abs(clampedX) < 65 && thresholdTriggered) {
        thresholdTriggered = false;
      }
    }
  }, { passive: true });

  rowEl.addEventListener('touchend', () => {
    rowEl.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), background 0.22s ease';
    if (currentX > 65) {
      // Vibration Stage 2: Trigger vibration when action releases to open edit modal
      triggerHaptic('click');
      rowEl.style.transform = 'translateX(0)';
      rowEl.classList.remove('swiping-right', 'swiping-left');
      openEditTaskModal(taskId);
    } else if (currentX < -65) {
      // Vibration Stage 2: Trigger vibration when action releases to open delete confirmation
      triggerHaptic('heavyClick');
      rowEl.style.transform = 'translateX(-100%)';
      setTimeout(() => {
        deleteTask(taskId);
      }, 200);
    } else {
      rowEl.style.transform = 'translateX(0)';
      rowEl.classList.remove('swiping-right', 'swiping-left');
    }
    startX = 0;
    currentX = 0;
    isSwiping = false;
    thresholdTriggered = false;
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
  triggerHaptic('click');
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = newStatus;
  saveTasksToStorage();
  renderApp();
  showToast(`Status changed to ${newStatus}`, 'info');
}

function resetAllRowPositions() {
  document.querySelectorAll('.task-table-row').forEach(row => {
    row.style.transform = 'translateX(0)';
    row.classList.remove('swiping-right', 'swiping-left');
  });
}

let onConfirmActionCallback = null;

function showConfirmModal({ title, message, confirmText = 'Delete', iconClass = 'fa-triangle-exclamation', onConfirm }) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-modal-title');
  const messageEl = document.getElementById('confirm-modal-message');
  const actionBtn = document.getElementById('action-confirm-btn');

  if (titleEl) titleEl.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${title}`;
  if (messageEl) messageEl.textContent = message;
  if (actionBtn) actionBtn.innerHTML = `<i class="fa-solid fa-trash"></i> ${confirmText}`;

  onConfirmActionCallback = onConfirm;
  if (modal) modal.classList.remove('hidden');
}

function closeConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.classList.add('hidden');
  onConfirmActionCallback = null;
  resetAllRowPositions();
}

function deleteTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  const taskName = task ? `"${task.name}"` : 'this task';

  showConfirmModal({
    title: 'Delete Task',
    message: `Are you sure you want to delete ${taskName}?`,
    confirmText: 'Delete',
    iconClass: 'fa-triangle-exclamation',
    onConfirm: () => {
      tasks = tasks.filter(t => t.id !== taskId);
      saveTasksToStorage();
      renderApp();
      showToast('Task deleted successfully', 'warning');
    }
  });
}

// ==========================================
// SCROLLABLE 24-HOUR WHEEL TIME PICKER ENGINE
// ==========================================
let isWheelInitialized = false;
let isAutoUpdatingEndTime = false;
let isProgrammaticWheelScroll = false;

function initWheelTimePickers() {
  const startHourWheel = document.getElementById('start-hour-wheel');
  const startMinWheel = document.getElementById('start-min-wheel');
  const endHourWheel = document.getElementById('end-hour-wheel');
  const endMinWheel = document.getElementById('end-min-wheel');

  if (!startHourWheel || !startMinWheel || !endHourWheel || !endMinWheel) return;

  if (isWheelInitialized) return;
  isWheelInitialized = true;

  // Build Hours 00 to 23
  let hoursHtml = '';
  for (let i = 0; i < 24; i++) {
    const hh = String(i).padStart(2, '0');
    hoursHtml += `<div class="wheel-item" data-val="${hh}">${hh}</div>`;
  }

  // Build Minutes 00 to 59 (step of 1 minute)
  let minHtml = '';
  for (let i = 0; i < 60; i++) {
    const mm = String(i).padStart(2, '0');
    minHtml += `<div class="wheel-item" data-val="${mm}">${mm}</div>`;
  }

  startHourWheel.innerHTML = hoursHtml;
  endHourWheel.innerHTML = hoursHtml;
  startMinWheel.innerHTML = minHtml;
  endMinWheel.innerHTML = minHtml;

  attachWheelListeners(startHourWheel, 'start-h');
  attachWheelListeners(startMinWheel, 'start-m');
  attachWheelListeners(endHourWheel, 'end-h');
  attachWheelListeners(endMinWheel, 'end-m');
}

function attachWheelListeners(wheelEl, type) {
  let scrollTimeout;

  wheelEl.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      onWheelScrollEnd(wheelEl, type);
    }, 60);
  }, { passive: true });

  wheelEl.querySelectorAll('.wheel-item').forEach(item => {
    item.addEventListener('click', () => {
      const val = item.dataset.val;
      scrollToWheelValue(wheelEl, val, true);
      onWheelScrollEnd(wheelEl, type);
    });
  });
}

function scrollToWheelValue(wheelEl, val, smooth = false) {
  if (!wheelEl) return;
  const items = Array.from(wheelEl.querySelectorAll('.wheel-item'));
  const targetItem = items.find(el => el.dataset.val === val) || items[0];

  if (targetItem) {
    const itemHeight = 32;
    const index = items.indexOf(targetItem);
    wheelEl.scrollTo({ top: index * itemHeight, behavior: smooth ? 'smooth' : 'auto' });

    items.forEach(el => el.classList.remove('selected'));
    targetItem.classList.add('selected');
  }
}

function getSelectedWheelValue(wheelEl) {
  if (!wheelEl) return '00';
  const itemHeight = 32;
  const index = Math.round(wheelEl.scrollTop / itemHeight);
  const items = wheelEl.querySelectorAll('.wheel-item');
  const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

  items.forEach((el, i) => {
    if (i === clampedIndex) el.classList.add('selected');
    else el.classList.remove('selected');
  });

  return items[clampedIndex] ? items[clampedIndex].dataset.val : '00';
}

function onWheelScrollEnd(wheelEl, type) {
  if (isProgrammaticWheelScroll) return;

  triggerHaptic('snap');
  if (type.startsWith('start')) {
    const startH = getSelectedWheelValue(document.getElementById('start-hour-wheel'));
    const startM = getSelectedWheelValue(document.getElementById('start-min-wheel'));
    const newStartTime = `${startH}:${startM}`;

    const startTimeInput = document.getElementById('task-start-time');
    if (startTimeInput) startTimeInput.value = newStartTime;

    // Rule: End time is automatically updated based on Start time (+1 minute) ONLY during manual user interaction
    if (!isAutoUpdatingEndTime) {
      isAutoUpdatingEndTime = true;
      let startHNum = parseInt(startH, 10);
      let startMNum = parseInt(startM, 10);

      let endMNum = startMNum + 1;
      let endHNum = startHNum;
      if (endMNum >= 60) {
        endMNum = 0;
        endHNum = (endHNum + 1) % 24;
      }

      let endH = String(endHNum).padStart(2, '0');
      let endM = String(endMNum).padStart(2, '0');

      const endHourWheel = document.getElementById('end-hour-wheel');
      const endMinWheel = document.getElementById('end-min-wheel');

      scrollToWheelValue(endHourWheel, endH, true);
      scrollToWheelValue(endMinWheel, endM, true);

      const endTimeInput = document.getElementById('task-end-time');
      if (endTimeInput) endTimeInput.value = `${endH}:${endM}`;

      setTimeout(() => { isAutoUpdatingEndTime = false; }, 300);
    }
  } else if (type.startsWith('end')) {
    const endH = getSelectedWheelValue(document.getElementById('end-hour-wheel'));
    const endM = getSelectedWheelValue(document.getElementById('end-min-wheel'));
    const endTimeInput = document.getElementById('task-end-time');
    if (endTimeInput) endTimeInput.value = `${endH}:${endM}`;
  }
}

function setTimePickerValue(startStr, endStr) {
  initWheelTimePickers();

  const [startH, startM] = (startStr || '08:00').split(':');
  const [endH, endM] = (endStr || '09:00').split(':');

  const startHourWheel = document.getElementById('start-hour-wheel');
  const startMinWheel = document.getElementById('start-min-wheel');
  const endHourWheel = document.getElementById('end-hour-wheel');
  const endMinWheel = document.getElementById('end-min-wheel');

  isProgrammaticWheelScroll = true;

  setTimeout(() => {
    scrollToWheelValue(startHourWheel, startH || '08');
    scrollToWheelValue(startMinWheel, startM || '00');
    scrollToWheelValue(endHourWheel, endH || '09');
    scrollToWheelValue(endMinWheel, endM || '00');

    document.getElementById('task-start-time').value = `${startH || '08'}:${startM || '00'}`;
    document.getElementById('task-end-time').value = `${endH || '09'}:${endM || '00'}`;

    setTimeout(() => {
      isProgrammaticWheelScroll = false;
    }, 350);
  }, 50);
}

function updateCategorySelectColor() {
  const categorySelect = document.getElementById('task-category');
  if (!categorySelect) return;

  const val = categorySelect.value;
  let bg = '#c2410c';
  if (val === 'Worship') bg = '#0284c7';
  else if (val === 'Exercise') bg = '#b45309';
  else if (val === 'Must Do') bg = '#c2410c';
  else if (val === 'Play') bg = '#7e22ce';
  else if (val === 'Essentials') bg = '#be185d';

  categorySelect.style.backgroundColor = bg;
  categorySelect.style.color = '#ffffff';
  categorySelect.style.fontWeight = '800';
}

function openAddTaskModal() {
  triggerHaptic('click');
  resetAllRowPositions();
  const titleEl = document.getElementById('modal-task-title');
  if (titleEl) titleEl.textContent = 'Add New Task';

  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-status').value = 'Pending';
  document.getElementById('task-category').value = 'Must Do';
  updateCategorySelectColor();
  setTimePickerValue('08:00', '08:01');
  document.getElementById('task-modal').classList.remove('hidden');
}

function openEditTaskModal(taskId) {
  triggerHaptic('click');
  resetAllRowPositions();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const titleEl = document.getElementById('modal-task-title');
  if (titleEl) titleEl.textContent = 'Edit Daily Task';

  document.getElementById('task-id').value = task.id;
  document.getElementById('task-name').value = task.name;
  document.getElementById('task-category').value = task.category;
  updateCategorySelectColor();
  document.getElementById('task-status').value = task.status || 'Pending';
  setTimePickerValue(task.startTime, task.endTime);
  document.getElementById('task-notes').value = task.notes || '';

  document.getElementById('task-modal').classList.remove('hidden');
}

function handleSaveTask(e) {
  e.preventDefault();
  triggerHaptic('heavyClick');

  const id = document.getElementById('task-id').value;
  const name = document.getElementById('task-name').value.trim();
  const category = document.getElementById('task-category').value;
  const status = document.getElementById('task-status').value || 'Pending';
  const notes = document.getElementById('task-notes').value.trim();

  // Read Start & End Time directly from active wheel selection
  const startH = getSelectedWheelValue(document.getElementById('start-hour-wheel')) || '08';
  const startM = getSelectedWheelValue(document.getElementById('start-min-wheel')) || '00';
  const endH = getSelectedWheelValue(document.getElementById('end-hour-wheel')) || '09';
  const endM = getSelectedWheelValue(document.getElementById('end-min-wheel')) || '00';

  const startTime = `${startH}:${startM}`;
  const endTime = `${endH}:${endM}`;

  const startTimeInput = document.getElementById('task-start-time');
  const endTimeInput = document.getElementById('task-end-time');
  if (startTimeInput) startTimeInput.value = startTime;
  if (endTimeInput) endTimeInput.value = endTime;

  if (!name || !startTime || !endTime) {
    showToast('Please fill in all required fields (*)', 'error');
    return;
  }

  if (startTime >= endTime) {
    showToast('End time must be after start time', 'error');
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
      showToast('Task updated successfully!', 'success');
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
    showToast('Task added successfully!', 'success');
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
  showConfirmModal({
    title: 'Reset Local Cache',
    message: 'Are you sure you want to reset all local data and reload demo tasks?',
    confirmText: 'Reset',
    iconClass: 'fa-rotate-right',
    onConfirm: () => {
      localStorage.removeItem(STATE_KEY_TASKS);
      initStorage();
      renderApp();
      document.getElementById('settings-modal').classList.add('hidden');
      showToast('Local data reset successfully.', 'info');
    }
  });
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

// Date Long-Press Gesture Handler (Hold to Return to Today)
function initDateLongPressGesture() {
  const selectedDateEl = document.getElementById('selected-date-display');
  const datePicker = document.getElementById('date-picker-input');

  if (!selectedDateEl) return;

  let longPressTimer = null;
  let isLongPress = false;
  const LONG_PRESS_DURATION = 400;

  const startPress = () => {
    isLongPress = false;
    selectedDateEl.classList.add('holding-date');

    longPressTimer = setTimeout(() => {
      isLongPress = true;
      selectedDateEl.classList.remove('holding-date');

      triggerHaptic('holdSuccess');

      currentSelectedDate = getTodayDateString();
      renderApp();
      showToast('Switched to Today', 'info');
    }, LONG_PRESS_DURATION);
  };

  const cancelPress = () => {
    selectedDateEl.classList.remove('holding-date');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const endPress = (e) => {
    cancelPress();
    if (!isLongPress) {
      const todayStr = getTodayDateString();
      // Forbid opening date picker if already viewing Today!
      if (currentSelectedDate === todayStr) {
        return;
      }

      if (datePicker && e.target !== datePicker) {
        if (typeof datePicker.showPicker === 'function') {
          try { datePicker.showPicker(); } catch (err) { datePicker.click(); }
        } else {
          datePicker.click();
        }
      }
    }
  };

  // Touch Events (Mobile)
  selectedDateEl.addEventListener('touchstart', startPress, { passive: true });
  selectedDateEl.addEventListener('touchend', endPress);
  selectedDateEl.addEventListener('touchcancel', cancelPress);

  // Mouse Events (Desktop)
  selectedDateEl.addEventListener('mousedown', startPress);
  selectedDateEl.addEventListener('mouseup', endPress);
  selectedDateEl.addEventListener('mouseleave', cancelPress);
}

// Event Listeners
function initEventListeners() {
  const prevBtn = document.getElementById('prev-day-btn');
  const nextBtn = document.getElementById('next-day-btn');
  if (prevBtn) prevBtn.addEventListener('click', () => changeDate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeDate(1));

  initDateLongPressGesture();

  const datePicker = document.getElementById('date-picker-input');
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        currentSelectedDate = e.target.value;
        renderApp();
      }
    });
  }

  const fCat = document.getElementById('filter-category');
  if (fCat) fCat.addEventListener('change', renderTasksList);
  const fStat = document.getElementById('filter-status');
  if (fStat) fStat.addEventListener('change', renderTasksList);

  const taskCategorySelect = document.getElementById('task-category');
  if (taskCategorySelect) {
    taskCategorySelect.addEventListener('change', updateCategorySelectColor);
  }

  document.getElementById('add-task-btn').addEventListener('click', openAddTaskModal);

  document.getElementById('close-task-modal').addEventListener('click', () => {
    document.getElementById('task-modal').classList.add('hidden');
    resetAllRowPositions();
  });
  document.getElementById('cancel-task-btn').addEventListener('click', () => {
    document.getElementById('task-modal').classList.add('hidden');
    resetAllRowPositions();
  });
  document.getElementById('task-form').addEventListener('submit', handleSaveTask);

  // Confirm Modal Listeners
  const closeConfirmBtn = document.getElementById('close-confirm-modal');
  const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
  const actionConfirmBtn = document.getElementById('action-confirm-btn');

  if (closeConfirmBtn) closeConfirmBtn.addEventListener('click', closeConfirmModal);
  if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', closeConfirmModal);
  if (actionConfirmBtn) {
    actionConfirmBtn.addEventListener('click', () => {
      if (typeof onConfirmActionCallback === 'function') {
        onConfirmActionCallback();
      }
      closeConfirmModal();
    });
  }

  const openSettingsBtn = document.getElementById('open-settings-btn');
  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);

  const sidebarSettingsBtn = document.getElementById('sidebar-settings-btn');
  if (sidebarSettingsBtn) sidebarSettingsBtn.addEventListener('click', openSettingsModal);

  const closeSettingsBtn = document.getElementById('close-settings-modal');
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });

  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);

  const resetStorageBtn = document.getElementById('reset-storage-btn');
  if (resetStorageBtn) resetStorageBtn.addEventListener('click', resetStorageData);

  const quickPushBtn = document.getElementById('quick-push-btn');
  if (quickPushBtn) quickPushBtn.addEventListener('click', pushDataToGoogleSheets);

  const quickPullBtn = document.getElementById('quick-pull-btn');
  if (quickPullBtn) quickPullBtn.addEventListener('click', pullDataFromGoogleSheets);

  const sidebarSyncBtn = document.getElementById('sidebar-sync-btn');
  if (sidebarSyncBtn) sidebarSyncBtn.addEventListener('click', openSettingsModal);

  const pushDataBtn = document.getElementById('push-data-btn');
  if (pushDataBtn) pushDataBtn.addEventListener('click', pushDataToGoogleSheets);

  const pullDataBtn = document.getElementById('pull-data-btn');
  if (pullDataBtn) pullDataBtn.addEventListener('click', pullDataFromGoogleSheets);

  const navDailyTasks = document.querySelector('[data-tab="daily-tasks"]');
  if (navDailyTasks) {
    navDailyTasks.addEventListener('click', (e) => {
      triggerHaptic('click');
      autoScrollToActiveTask();
    });
  }
}

function initStickyBannerScroll() {
  const banner = document.getElementById('active-task-banner');
  if (!banner) return;

  const handleScroll = () => {
    const rect = banner.getBoundingClientRect();
    if (window.scrollY > 20 || rect.top <= 16) {
      banner.classList.add('is-floating');
    } else {
      banner.classList.remove('is-floating');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

function autoScrollToActiveTask() {
  if (currentSelectedDate !== getTodayDateString()) return;

  // Start from top of task view
  window.scrollTo({ top: 0, behavior: 'auto' });

  setTimeout(() => {
    const activeRow = document.querySelector('.task-table-row.active-now');
    if (!activeRow) return;

    const rowRect = activeRow.getBoundingClientRect();
    const rowAbsoluteTop = window.scrollY + rowRect.top;
    const viewportHeight = window.innerHeight;

    // Position active task row comfortably above bottom pill navbar (~45% down screen)
    const targetScrollY = Math.max(0, rowAbsoluteTop - (viewportHeight * 0.45));

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  }, 350);
}

function changeDate(daysOffset) {
  triggerHaptic('click');
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
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
