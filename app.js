/**
 * Personal Habit Tracker & Daily Task Scheduler - Core PWA Logic
 * Wireframe Layout Engine
 */

const STATE_KEY_TASKS = 'pts_tasks_v1';
const STATE_KEY_GAS_URL = 'pts_gas_url_v1';
const STATE_KEY_IBADAH = 'pts_ibadah_v1';
const STATE_KEY_NOFAP = 'pts_nofap_v1';
const STATE_KEY_EXERCISE = 'pts_exercise_v1';
const LOCKED_GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz-STcvV8kMGP04ZLuNcX3W3QuSU5q2XJnA9ScSquq8vgBBtcMjlhUw3IFM8LWl5sw/exec';

let tasks = [];
let ibadahData = {};
let nofapData = null;
let exerciseData = null;
let currentSelectedDate = getTodayDateString();
let currentIbadahDate = getTodayDateString();
let gasWebAppUrl = LOCKED_GAS_WEB_APP_URL;
let deferredInstallPrompt = null;

const NOFAP_BADGES = [
  { id: 'seedling', title: 'Seedling', days: 1, icon: 'fa-seedling' },
  { id: 'iron_will', title: 'Iron Will', days: 3, icon: 'fa-shield-halved' },
  { id: 'bronze_warrior', title: 'Bronze Warrior', days: 7, icon: 'fa-shield-cat' },
  { id: 'silver_guardian', title: 'Silver Guardian', days: 14, icon: 'fa-shield' },
  { id: 'gold_champion', title: 'Gold Champion', days: 30, icon: 'fa-trophy' },
  { id: 'diamond_titan', title: 'Diamond Titan', days: 60, icon: 'fa-gem' },
  { id: 'master_conqueror', title: 'Master Conqueror', days: 90, icon: 'fa-crown' },
  { id: 'legendary_sovereign', title: 'Legendary Sovereign', days: 180, icon: 'fa-fire-flame-curved' }
];

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
  initTabNavigation();
  initIbadahEngine();
  initNoFapEngine();
  initExerciseEngine();
  initFabCloudMenu();
  initAppLockEngine();
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


// Initialize Local Storage
function initStorage() {
  const storedTasks = localStorage.getItem(STATE_KEY_TASKS);
  if (storedTasks) {
    try {
      tasks = JSON.parse(storedTasks);
    } catch (e) {
      console.error('Failed to parse local tasks:', e);
      tasks = [];
    }
  } else {
    tasks = [];
    saveTasksToStorage();
  }

  const storedIbadah = localStorage.getItem(STATE_KEY_IBADAH);
  if (storedIbadah) {
    try {
      ibadahData = JSON.parse(storedIbadah);
    } catch (e) {
      console.error('Failed to parse Ibadah data:', e);
      ibadahData = {};
    }
  }

  const storedNoFap = localStorage.getItem(STATE_KEY_NOFAP);
  if (storedNoFap) {
    try {
      nofapData = JSON.parse(storedNoFap);
      if (typeof recalculateAllNoFapHistoryStreaks === 'function') recalculateAllNoFapHistoryStreaks();
    } catch (e) {
      console.error('Failed to parse NoFap data:', e);
      initDefaultNoFapData();
    }
  } else {
    initDefaultNoFapData();
  }

  const storedExercise = localStorage.getItem(STATE_KEY_EXERCISE);
  if (storedExercise) {
    try {
      exerciseData = JSON.parse(storedExercise);
      if (!exerciseData || !exerciseData.workouts || exerciseData.workouts.length === 0) {
        initDefaultExerciseData();
      }
    } catch (e) {
      console.error('Failed to parse Exercise data:', e);
      initDefaultExerciseData();
    }
  } else {
    initDefaultExerciseData();
  }

  gasWebAppUrl = LOCKED_GAS_WEB_APP_URL;
  localStorage.setItem(STATE_KEY_GAS_URL, LOCKED_GAS_WEB_APP_URL);
  const gasInput = document.getElementById('gas-url-input');
  if (gasInput) {
    gasInput.value = LOCKED_GAS_WEB_APP_URL;
    gasInput.readOnly = true;
  }
}

function initDefaultNoFapData() {
  nofapData = {
    startDate: new Date().toISOString(),
    longestStreakDays: 0,
    totalCheckins: 0,
    lastCheckinDate: null,
    history: []
  };
  saveNoFapDataToStorage();
}

function saveTasksToStorage() {
  localStorage.setItem(STATE_KEY_TASKS, JSON.stringify(tasks));
}

function saveIbadahDataToStorage() {
  localStorage.setItem(STATE_KEY_IBADAH, JSON.stringify(ibadahData));
}

function saveNoFapDataToStorage() {
  localStorage.setItem(STATE_KEY_NOFAP, JSON.stringify(nofapData));
}

function saveExerciseDataToStorage() {
  localStorage.setItem(STATE_KEY_EXERCISE, JSON.stringify(exerciseData));
}

// ==========================================
// CLOCK & ACTIVE BANNER ENGINE
// ==========================================
function initClockAndBanner() {
  updateClock();
  updateActiveTaskBanner();

  setInterval(updateClock, 1000);
  setInterval(updateActiveTaskBanner, 5000);
}

function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timeHtml = `${hh}:${mm}<span class="clock-seconds">:${ss}</span>`;
  const dateText = formatWireframeDateHeader(getTodayDateString());

  const clockEl = document.getElementById('live-clock');
  const dateEl = document.getElementById('live-date');
  if (clockEl) clockEl.innerHTML = timeHtml;
  if (dateEl) dateEl.textContent = dateText;

  const ibadahClockEl = document.getElementById('ibadah-live-clock');
  const ibadahDateEl = document.getElementById('ibadah-live-date');
  if (ibadahClockEl) ibadahClockEl.innerHTML = timeHtml;
  if (ibadahDateEl) ibadahDateEl.textContent = dateText;

  const nofapClockEl = document.getElementById('nofap-live-clock');
  const nofapDateEl = document.getElementById('nofap-live-date');
  if (nofapClockEl) nofapClockEl.innerHTML = timeHtml;
  if (nofapDateEl) nofapDateEl.textContent = dateText;

  const exerciseClockEl = document.getElementById('exercise-live-clock');
  const exerciseDateEl = document.getElementById('exercise-live-date');
  if (exerciseClockEl) exerciseClockEl.innerHTML = timeHtml;
  if (exerciseDateEl) exerciseDateEl.textContent = dateText;
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
  if (typeof renderIbadahPage === 'function') renderIbadahPage();
  if (typeof renderNoFapPage === 'function') renderNoFapPage();
  if (typeof renderExercisePage === 'function') renderExercisePage();
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
      <div class="swipe-indicator swipe-delete"><i class="fa-solid fa-trash-can"></i> Delete</div>

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
  document.querySelectorAll('.task-table-row, .workout-card, .workout-card-wrapper').forEach(row => {
    row.style.transform = 'translateX(0)';
    row.classList.remove('swiping-right', 'swiping-left');
  });
}

let onConfirmActionCallback = null;

function showConfirmModal({
  title,
  message,
  confirmText = 'Delete',
  confirmBtnClass = 'btn-danger',
  iconClass = 'fa-triangle-exclamation',
  requireCheckbox = false,
  checkboxText = 'I confirm this action',
  onConfirm
}) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-modal-title');
  const messageEl = document.getElementById('confirm-modal-message');
  const actionBtn = document.getElementById('action-confirm-btn');
  const checkboxGroup = document.getElementById('confirm-checkbox-group');
  const checkboxInput = document.getElementById('confirm-modal-checkbox');
  const checkboxLabel = document.getElementById('confirm-checkbox-label');

  if (titleEl) titleEl.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${title}`;
  if (messageEl) messageEl.textContent = message;

  if (actionBtn) {
    actionBtn.className = `btn ${confirmBtnClass}`;
    actionBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${confirmText}`;
  }

  if (requireCheckbox && checkboxGroup && checkboxInput) {
    checkboxGroup.classList.remove('hidden');
    checkboxInput.checked = false;
    if (checkboxLabel) checkboxLabel.textContent = checkboxText;
    if (actionBtn) actionBtn.disabled = true;

    checkboxInput.onchange = () => {
      triggerHaptic('click');
      if (actionBtn) actionBtn.disabled = !checkboxInput.checked;
    };
  } else {
    if (checkboxGroup) checkboxGroup.classList.add('hidden');
    if (actionBtn) actionBtn.disabled = false;
  }

  onConfirmActionCallback = onConfirm;
  if (modal) modal.classList.remove('hidden');
}

function closeConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.classList.add('hidden');
  const checkboxInput = document.getElementById('confirm-modal-checkbox');
  if (checkboxInput) checkboxInput.checked = false;
  const actionBtn = document.getElementById('action-confirm-btn');
  if (actionBtn) actionBtn.disabled = false;
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

  // Streamlined Frictionless UX: Auto-Focus Task Name Input Box (Triggers Software Keyboard on Mobile)
  setTimeout(() => {
    const taskNameInput = document.getElementById('task-name');
    if (taskNameInput) {
      taskNameInput.focus();
    }
  }, 60);
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

  // Auto-Focus Task Name Input Box
  setTimeout(() => {
    const taskNameInput = document.getElementById('task-name');
    if (taskNameInput) {
      taskNameInput.focus();
      if (typeof taskNameInput.select === 'function') taskNameInput.select();
    }
  }, 60);
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

// Helper: Sync Web App URL from input box to memory & localStorage
function syncGasUrlFromInput() {
  gasWebAppUrl = LOCKED_GAS_WEB_APP_URL;
  localStorage.setItem(STATE_KEY_GAS_URL, LOCKED_GAS_WEB_APP_URL);
  const input = document.getElementById('gas-url-input');
  if (input) {
    input.value = LOCKED_GAS_WEB_APP_URL;
    input.readOnly = true;
  }
  return gasWebAppUrl;
}

// ==========================================
// GOOGLE SHEETS SYNC (PUSH & PULL)
// ==========================================
async function pushDataToGoogleSheets() {
  syncGasUrlFromInput();

  if (!gasWebAppUrl) {
    showToast('Google Apps Script URL is not set. Open Settings.', 'warning');
    openSettingsModal();
    return;
  }

  showToast('Uploading Tasks, Worship, Streak & Exercise data to Google Sheets...', 'info');

  try {
    const payload = {
      action: 'upload_all',
      tasks: tasks,
      ibadah: ibadahData,
      nofap: nofapData,
      exercise: exerciseData,
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
      showToast('Upload successful! Tasks, Worship, Streak & Exercise data saved.', 'success');
    } else {
      showToast(result.message || 'Upload complete', 'success');
    }
  } catch (error) {
    console.error('GAS Push Error:', error);
    showToast('Failed to connect to Google Sheets. Check GAS Web App URL.', 'error');
  }
}

function sanitizeTaskTime(timeStr) {
  if (!timeStr) return '08:00';
  const str = String(timeStr).trim();
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const parts = str.split(':');
    return `${String(parts[0]).padStart(2, '0')}:${parts[1]}`;
  }
  const match = str.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (match) {
    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  }
  return '08:00';
}

function sanitizeTaskDate(dateStr) {
  if (!dateStr) return getTodayDateString();
  const str = String(dateStr).trim();
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[0];
  return str;
}

async function pullDataFromGoogleSheets() {
  syncGasUrlFromInput();

  if (!gasWebAppUrl) {
    showToast('Google Apps Script URL is not set. Open Settings.', 'warning');
    openSettingsModal();
    return;
  }

  showToast('Fetching Tasks, Worship, Streak & Exercise data from Google Sheets...', 'info');

  try {
    const fetchUrl = `${gasWebAppUrl}?action=get_all&t=${Date.now()}`;
    const response = await fetch(fetchUrl);
    const result = await response.json();

    if (result && result.status === 'success') {
      let taskCount = 0;
      let ibadahDaysCount = 0;

      if (Array.isArray(result.tasks)) {
        tasks = result.tasks.map(t => ({
          ...t,
          date: sanitizeTaskDate(t.date),
          startTime: sanitizeTaskTime(t.startTime),
          endTime: sanitizeTaskTime(t.endTime)
        }));
        saveTasksToStorage();
        taskCount = tasks.length;
      }

      if (result.ibadah && typeof result.ibadah === 'object') {
        ibadahData = result.ibadah;
        saveIbadahDataToStorage();
        ibadahDaysCount = Object.keys(ibadahData).length;
      }

      if (result.nofap && typeof result.nofap === 'object') {
        nofapData = result.nofap;
        if (typeof recalculateAllNoFapHistoryStreaks === 'function') recalculateAllNoFapHistoryStreaks();
        saveNoFapDataToStorage();
      }

      if (result.exercise && typeof result.exercise === 'object') {
        exerciseData = result.exercise;
        saveExerciseDataToStorage();
      }

      renderApp();
      showToast(`Download successful! Sync completed.`, 'success');
    } else {
      showToast('Google Sheets data is empty.', 'warning');
    }
  } catch (error) {
    console.error('GAS Pull Error:', error);
    showToast('Failed to download data from Google Sheets.', 'error');
  }
}

function openSettingsModal() {
  const input = document.getElementById('gas-url-input');
  if (input) {
    input.value = LOCKED_GAS_WEB_APP_URL;
    input.readOnly = true;
  }
  document.getElementById('settings-modal').classList.remove('hidden');
}

function saveSettings() {
  syncGasUrlFromInput();
  document.getElementById('settings-modal').classList.add('hidden');
  showToast('Settings saved!', 'success');
}

function resetStorageData() {
  showConfirmModal({
    title: 'Reset Local Cache',
    message: 'Are you sure you want to clear all local tasks, worship, streak tracker, and exercise data?',
    confirmText: 'Reset',
    iconClass: 'fa-rotate-right',
    onConfirm: () => {
      localStorage.removeItem(STATE_KEY_TASKS);
      localStorage.removeItem(STATE_KEY_IBADAH);
      localStorage.removeItem(STATE_KEY_NOFAP);
      localStorage.removeItem(STATE_KEY_EXERCISE);
      tasks = [];
      ibadahData = {};
      initDefaultNoFapData();
      initDefaultExerciseData();
      saveTasksToStorage();
      saveIbadahDataToStorage();
      saveNoFapDataToStorage();
      saveExerciseDataToStorage();
      initStorage();
      renderApp();
      document.getElementById('settings-modal').classList.add('hidden');
      showToast('All local task, worship, and streak tracker cache cleared successfully.', 'info');
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

  const taskCategorySelect = document.getElementById('task-category');
  if (taskCategorySelect) {
    taskCategorySelect.addEventListener('change', updateCategorySelectColor);
  }

  const addTaskBtn = document.getElementById('add-task-btn');
  if (addTaskBtn) addTaskBtn.addEventListener('click', openAddTaskModal);

  const closeTaskModalBtn = document.getElementById('close-task-modal');
  if (closeTaskModalBtn) {
    closeTaskModalBtn.addEventListener('click', () => {
      document.getElementById('task-modal').classList.add('hidden');
      resetAllRowPositions();
    });
  }

  const cancelTaskBtn = document.getElementById('cancel-task-btn');
  if (cancelTaskBtn) {
    cancelTaskBtn.addEventListener('click', () => {
      document.getElementById('task-modal').classList.add('hidden');
      resetAllRowPositions();
    });
  }

  const taskForm = document.getElementById('task-form');
  if (taskForm) taskForm.addEventListener('submit', handleSaveTask);

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

  // Settings Modal Listeners
  const copyGasUrlBtn = document.getElementById('copy-gas-url-btn');
  if (copyGasUrlBtn) {
    copyGasUrlBtn.addEventListener('click', () => {
      triggerHaptic('click');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(LOCKED_GAS_WEB_APP_URL)
          .then(() => {
            showToast('Web App URL copied to clipboard!', 'success');
          })
          .catch(() => {
            showToast('Web App URL copied to clipboard!', 'success');
          });
      } else {
        const input = document.getElementById('gas-url-input');
        if (input) {
          input.select();
          document.execCommand('copy');
          showToast('Web App URL copied to clipboard!', 'success');
        }
      }
    });
  }

  const gasUrlInput = document.getElementById('gas-url-input');
  if (gasUrlInput) {
    gasUrlInput.addEventListener('input', syncGasUrlFromInput);
    gasUrlInput.addEventListener('change', syncGasUrlFromInput);
  }

  const closeSettingsBtn = document.getElementById('close-settings-modal');
  const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });

  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);

  const resetStorageBtn = document.getElementById('reset-storage-btn');
  if (resetStorageBtn) resetStorageBtn.addEventListener('click', resetStorageData);

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

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-xmark';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// ==========================================
// IBADAH (WORSHIP TRACKER) ENGINE & TAB NAVIGATION
// ==========================================

const FARD_PRAYERS_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isya'];
const SUNNAH_PRAYERS_KEYS = ['tahajud', 'dhuha', 'taubat', 'hajat'];

const PRAYER_CONFIG = [
  { key: 'tahajud', name: 'Tahajud', icon: 'fa-moon', defaultStart: '03:00', category: 'sunnah' },
  { key: 'fajr', name: 'Fajr', icon: 'fa-cloud-sun', defaultStart: '04:15', category: 'fard' },
  { key: 'dhuha', name: 'Dhuha', icon: 'fa-sun', defaultStart: '06:30', category: 'sunnah' },
  { key: 'dhuhr', name: 'Dhuhr', icon: 'fa-sun-plant-wilt', defaultStart: '12:00', category: 'fard' },
  { key: 'asr', name: 'Asr', icon: 'fa-cloud-sun', defaultStart: '15:00', category: 'fard' },
  { key: 'maghrib', name: 'Maghrib', icon: 'fa-cloud-moon', defaultStart: '17:30', category: 'fard' },
  { key: 'isya', name: 'Isya', icon: 'fa-star-and-crescent', defaultStart: '19:00', category: 'fard' },
  { key: 'taubat', name: 'Taubat', icon: 'fa-hands-praying', defaultStart: '20:00', category: 'sunnah' },
  { key: 'hajat', name: 'Hajat', icon: 'fa-hand-holding-heart', defaultStart: '20:00', category: 'sunnah' }
];

function showPrayerFocusEffect(rowEl) {
  const backdrop = document.getElementById('focus-backdrop');
  if (backdrop) backdrop.classList.add('visible');
  document.querySelectorAll('.ibadah-row').forEach(r => r.classList.remove('is-focused'));
  if (rowEl) rowEl.classList.add('is-focused');
}

function clearPrayerFocusEffect() {
  const backdrop = document.getElementById('focus-backdrop');
  if (backdrop) backdrop.classList.remove('visible');
  document.querySelectorAll('.ibadah-row').forEach(r => r.classList.remove('is-focused'));
}

function initTabNavigation() {
  const navItems = document.querySelectorAll('.pill-nav-item[data-tab]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = item.dataset.tab;
      if (!tabName || item.classList.contains('disabled')) return;

      // Re-tapping active tab smoothly scrolls to the top of the page!
      if (item.classList.contains('active')) {
        triggerHaptic('click');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (typeof item.blur === 'function') item.blur();
        return;
      }

      triggerHaptic('click');
      clearPrayerFocusEffect();

      navItems.forEach(i => {
        i.classList.remove('active');
        if (typeof i.blur === 'function') i.blur();
      });
      item.classList.add('active');
      if (typeof item.blur === 'function') item.blur();

      document.querySelectorAll('.tab-page-view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
      });

      const targetView = document.getElementById(`view-${tabName}`);
      if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
      }

      if (tabName === 'ibadah') {
        window.scrollTo({ top: 0, behavior: 'instant' });
        renderIbadahPage();
      } else if (tabName === 'daily-tasks') {
        renderApp();
        autoScrollToActiveTask();
      } else if (tabName === 'nofap') {
        window.scrollTo({ top: 0, behavior: 'instant' });
        renderNoFapPage();
      } else if (tabName === 'exercise') {
        window.scrollTo({ top: 0, behavior: 'instant' });
        renderExercisePage();
      }

      // Toggle Floating Add Workout FAB button visibility (exercise tab only)
      updateFabAddWorkoutVisibility(tabName);
    });
  });

  // Check initial tab visibility on app load
  updateFabAddWorkoutVisibility();
}

function updateFabAddWorkoutVisibility(explicitTabName) {
  const activeTab = document.querySelector('.pill-nav-item.active');
  const currentTab = explicitTabName || (activeTab ? activeTab.dataset.tab : 'daily-tasks');
  const fabAddWorkout = document.getElementById('fab-add-workout-wrapper');
  if (fabAddWorkout) {
    if (currentTab === 'exercise') {
      fabAddWorkout.classList.remove('hidden-fab');
    } else {
      fabAddWorkout.classList.add('hidden-fab');
    }
  }
}

function initIbadahDateLongPressGesture() {
  const selectedDateEl = document.getElementById('ibadah-selected-date-display');
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

      currentIbadahDate = getTodayDateString();
      renderIbadahPage();
      showToast('Switched Worship tracker to Today', 'info');
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
    // Prevent triggering native date picker on tap!
    if (e) e.preventDefault();
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

function getIbadahDateRecord(dateStr) {
  if (!ibadahData[dateStr]) {
    ibadahData[dateStr] = {
      prayers: {
        tahajud: 'Not Prayed',
        fajr: 'Not Prayed',
        dhuha: 'Not Prayed',
        dhuhr: 'Not Prayed',
        asr: 'Not Prayed',
        maghrib: 'Not Prayed',
        isya: 'Not Prayed',
        taubat: 'Not Prayed',
        hajat: 'Not Prayed'
      },
      quranDuration: 0
    };
    saveIbadahDataToStorage();
  }
  return ibadahData[dateStr];
}

function isPrayerTimeWindowArrived(prayerStartStr, dateStr) {
  const todayStr = getTodayDateString();

  // Past dates are ALWAYS unlocked!
  if (dateStr < todayStr) return true;

  // Future dates are forbidden
  if (dateStr > todayStr) return false;

  // For Today: Compare current HH:MM with prayer start time
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hh}:${mm}`;

  return currentTimeStr >= prayerStartStr;
}

function initIbadahEngine() {
  initIbadahDateLongPressGesture();

  const prevBtn = document.getElementById('ibadah-prev-day-btn');
  const nextBtn = document.getElementById('ibadah-next-day-btn');
  const datePicker = document.getElementById('ibadah-date-picker-input');
  const backdrop = document.getElementById('focus-backdrop');

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      clearPrayerFocusEffect();
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      clearPrayerFocusEffect();
      changeIbadahDate(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      clearPrayerFocusEffect();
      const todayStr = getTodayDateString();
      if (currentIbadahDate < todayStr) {
        changeIbadahDate(1);
      }
    });
  }

  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      clearPrayerFocusEffect();
      if (e.target.value) {
        const todayStr = getTodayDateString();
        if (e.target.value <= todayStr) {
          currentIbadahDate = e.target.value;
          renderIbadahPage();
        } else {
          showToast('Cannot select future dates for Worship tracker', 'warning');
          e.target.value = currentIbadahDate;
        }
      }
    });
  }

  // Good Habit Quran Stepper (+1 / -1 minute)
  const quranPlusBtn = document.getElementById('quran-plus-btn');
  const quranMinusBtn = document.getElementById('quran-minus-btn');
  const quranInput = document.getElementById('quran-duration-input');

  if (quranPlusBtn) {
    quranPlusBtn.addEventListener('click', () => adjustQuranDuration(1));
  }
  if (quranMinusBtn) {
    quranMinusBtn.addEventListener('click', () => adjustQuranDuration(-1));
  }
  if (quranInput) {
    quranInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      setQuranDuration(val);
    });
  }
}

function changeIbadahDate(daysOffset) {
  triggerHaptic('click');
  const todayStr = getTodayDateString();
  const [y, m, d] = currentIbadahDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + daysOffset);

  const newY = dateObj.getFullYear();
  const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
  const newD = String(dateObj.getDate()).padStart(2, '0');
  const newDateStr = `${newY}-${newM}-${newD}`;

  // Rule: Cannot navigate to future dates beyond Today!
  if (newDateStr > todayStr) {
    return;
  }

  currentIbadahDate = newDateStr;
  renderIbadahPage();
}

function setIbadahPrayerStatus(prayerKey, newStatus) {
  triggerHaptic('click');
  clearPrayerFocusEffect();
  const rec = getIbadahDateRecord(currentIbadahDate);
  rec.prayers[prayerKey] = newStatus;
  saveIbadahDataToStorage();
  renderIbadahPage();
  showToast(`Prayer status updated to ${newStatus}`, 'info');
}

function adjustQuranDuration(offset) {
  triggerHaptic('snap');
  const rec = getIbadahDateRecord(currentIbadahDate);
  let newDuration = Math.max(0, (rec.quranDuration || 0) + offset);
  rec.quranDuration = newDuration;
  saveIbadahDataToStorage();

  const quranInput = document.getElementById('quran-duration-input');
  if (quranInput) quranInput.value = newDuration;
}

function setQuranDuration(val) {
  const rec = getIbadahDateRecord(currentIbadahDate);
  rec.quranDuration = Math.max(0, val);
  saveIbadahDataToStorage();
}

function renderIbadahPage() {
  const dateLabel = document.getElementById('ibadah-date-label');
  const datePicker = document.getElementById('ibadah-date-picker-input');
  const nextBtn = document.getElementById('ibadah-next-day-btn');
  const liveDateEl = document.getElementById('ibadah-live-date');
  const liveClockEl = document.getElementById('ibadah-live-clock');

  const todayStr = getTodayDateString();
  const isToday = (currentIbadahDate === todayStr);

  if (liveDateEl) liveDateEl.textContent = formatWireframeDateHeader(getTodayDateString());
  if (liveClockEl) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    liveClockEl.innerHTML = `${hh}:${mm}<span class="clock-seconds">:${ss}</span>`;
  }

  if (dateLabel) {
    dateLabel.textContent = isToday ? 'TODAY' : formatWireframeDateHeader(currentIbadahDate);
  }

  if (datePicker) {
    datePicker.value = currentIbadahDate;
    datePicker.max = todayStr; // Block future date selection in calendar
  }

  // Restrict Next Arrow on Today
  if (nextBtn) {
    if (isToday) {
      nextBtn.classList.add('disabled-arrow');
    } else {
      nextBtn.classList.remove('disabled-arrow');
    }
  }

  // Render Prayers List
  const container = document.getElementById('ibadah-prayers-container');
  if (container) {
    container.innerHTML = '';
    const rec = getIbadahDateRecord(currentIbadahDate);

    PRAYER_CONFIG.forEach(prayer => {
      const currentStatus = rec.prayers[prayer.key] || 'Not Prayed';
      const isWindowArrived = isPrayerTimeWindowArrived(prayer.defaultStart, currentIbadahDate);

      let statusClass = 'status-not-prayed';
      if (currentStatus === "Qada'") statusClass = 'status-qada';
      else if (currentStatus === "Ada'") statusClass = 'status-ada';
      else if (currentStatus === "Jama'ah") statusClass = 'status-jamaah';

      const row = document.createElement('div');
      row.className = 'ibadah-row prayer-row';

      let selectHtml = '';
      if (!isWindowArrived) {
        // Locked State: Time window has not arrived yet!
        selectHtml = `
          <select class="ibadah-status-select is-locked" disabled title="Time window not arrived yet (${prayer.defaultStart})">
            <option selected>🔒 Locked</option>
          </select>
        `;
      } else if (prayer.category === 'sunnah') {
        // Sunnah prayers only have options: "Not Prayed" and "Ada'"
        selectHtml = `
          <select class="ibadah-status-select ${statusClass}" onchange="setIbadahPrayerStatus('${prayer.key}', this.value)">
            <option value="Not Prayed" ${currentStatus === 'Not Prayed' ? 'selected' : ''}>Not Prayed</option>
            <option value="Ada'" ${currentStatus === "Ada'" ? 'selected' : ''}>Ada'</option>
          </select>
        `;
      } else {
        // Mandatory (Fard) prayers have options: "Not Prayed", "Qada'", "Ada'", "Jama'ah"
        selectHtml = `
          <select class="ibadah-status-select ${statusClass}" onchange="setIbadahPrayerStatus('${prayer.key}', this.value)">
            <option value="Not Prayed" ${currentStatus === 'Not Prayed' ? 'selected' : ''}>Not Prayed</option>
            <option value="Qada'" ${currentStatus === "Qada'" ? 'selected' : ''}>Qada'</option>
            <option value="Ada'" ${currentStatus === "Ada'" ? 'selected' : ''}>Ada'</option>
            <option value="Jama'ah" ${currentStatus === "Jama'ah" ? 'selected' : ''}>Jama'ah</option>
          </select>
        `;
      }

      row.innerHTML = `
        <div class="ibadah-col-prayer">
          <div class="prayer-icon-circle"><i class="fa-solid ${prayer.icon}"></i></div>
          <span class="prayer-name-text">${prayer.name}</span>
        </div>
        <div class="ibadah-col-status">
          ${selectHtml}
        </div>
      `;

      // Attach Focus & Blur listeners for Focusing Blur Backdrop
      const selectEl = row.querySelector('.ibadah-status-select');
      if (selectEl && !selectEl.disabled) {
        selectEl.addEventListener('focus', () => showPrayerFocusEffect(row));
        selectEl.addEventListener('click', () => showPrayerFocusEffect(row));
        selectEl.addEventListener('blur', () => {
          setTimeout(clearPrayerFocusEffect, 150);
        });
      }

      container.appendChild(row);
    });
  }

  // Render Good Habits (Read Quran)
  const quranInput = document.getElementById('quran-duration-input');
  if (quranInput) {
    const rec = getIbadahDateRecord(currentIbadahDate);
    quranInput.value = rec.quranDuration || 0;
  }

  // Update Floating Summary Button visibility
  updateFloatingSummaryButtonState();
}

// ==========================================
// FLOATING SUMMARY BUTTON & WORSHIP SUMMARY PAGE ENGINE
// ==========================================
function initFloatingSummaryButton() {
  const floatBtn = document.getElementById('ibadah-floating-summary-btn');
  const backBtn = document.getElementById('back-to-ibadah-btn');

  if (floatBtn) {
    floatBtn.addEventListener('click', () => {
      triggerHaptic('click');
      openWorshipSummaryPage();
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      triggerHaptic('click');
      closeWorshipSummaryPage();
    });
  }

  const handleScroll = () => {
    updateFloatingSummaryButtonState();
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });
}

function handleExerciseFloatingBtnClick(e) {
  if (e) {
    e.stopPropagation();
    if (e.currentTarget && typeof e.currentTarget.blur === 'function') {
      e.currentTarget.blur();
    }
  }
  const btn = document.getElementById('exercise-floating-settings-btn');
  if (btn && typeof btn.blur === 'function') {
    btn.blur();
  }

  if (!btn) return;

  if (btn.dataset.mode === 'active') {
    scrollToActiveWorkout();
  } else {
    openExerciseSettingsModal();
  }
}

function scrollToActiveWorkout() {
  triggerHaptic('click');
  const activeCard = document.querySelector('.workout-card.active-workout') || document.querySelector('.workout-card.is-today');
  if (activeCard) {
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    const listEl = document.getElementById('exercise-workout-list');
    if (listEl) listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function isElementInViewport(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  return (rect.top < windowHeight - 60 && rect.bottom > 60);
}

function updateFloatingBannerTitle() {
  const floatingTitleEl = document.getElementById('exercise-floating-banner-title');
  if (!floatingTitleEl) return;

  const todayStr = getTodayDateString();
  const workouts = (exerciseData && exerciseData.workouts) ? exerciseData.workouts : [];
  const todayWorkout = workouts.find(w => w.date === todayStr) || workouts.find(w => w.status === 'Pending');

  if (todayWorkout && todayWorkout.menu) {
    floatingTitleEl.textContent = todayWorkout.menu;
  } else {
    floatingTitleEl.textContent = 'Active Workout Target';
  }
}

function updateFloatingSummaryButtonState() {
  const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  const isAtTop = currentScrollY <= 25;

  // 1. Worship Summary Floating Button (Visible ONLY when page is at the top)
  const ibadahFloatBtn = document.getElementById('ibadah-floating-summary-btn');
  if (ibadahFloatBtn) {
    const isIbadahViewVisible = document.getElementById('view-ibadah') && !document.getElementById('view-ibadah').classList.contains('hidden');
    if (isIbadahViewVisible && isAtTop) {
      ibadahFloatBtn.classList.remove('hidden-float');
    } else {
      ibadahFloatBtn.classList.add('hidden-float');
    }
  }

  // 2. Exercise Floating Controls (Settings vs Active Workout pill & Hero Banner Morph)
  const exerciseFloatBtn = document.getElementById('exercise-floating-settings-btn');
  const heroCard = document.getElementById('today-workout-hero');
  const isExerciseViewVisible = document.getElementById('view-exercise') && !document.getElementById('view-exercise').classList.contains('hidden');

  if (isExerciseViewVisible && exerciseFloatBtn) {
    const activeListCard = document.querySelector('.workout-card.active-workout') || document.querySelector('.workout-card.is-today');
    const isActiveListCardInView = isElementInViewport(activeListCard);

    if (isAtTop) {
      // Top of page: Show "Exercise Settings" pill, full hero banner
      exerciseFloatBtn.classList.remove('hidden-float');
      if (exerciseFloatBtn.dataset.mode !== 'settings') {
        exerciseFloatBtn.innerHTML = '<i class="fa-solid fa-sliders"></i><span>Exercise Settings</span>';
        exerciseFloatBtn.dataset.mode = 'settings';
      }

      if (heroCard) {
        heroCard.classList.remove('is-floating');
        heroCard.classList.remove('hidden-sticky');
      }
    } else if (isActiveListCardInView) {
      // Arrived at active workout card: HIDE floating pill AND HIDE sticky top banner!
      exerciseFloatBtn.classList.add('hidden-float');

      if (heroCard) {
        heroCard.classList.add('is-floating');
        heroCard.classList.add('hidden-sticky');
      }
    } else {
      // Scrolled past top, Active card NOT in view: Show "Active Workout" pill & sticky top banner!
      exerciseFloatBtn.classList.remove('hidden-float');
      if (exerciseFloatBtn.dataset.mode !== 'active') {
        exerciseFloatBtn.innerHTML = '<i class="fa-solid fa-person-running"></i><span>Active Workout</span>';
        exerciseFloatBtn.dataset.mode = 'active';
      }

      if (heroCard) {
        heroCard.classList.add('is-floating');
        heroCard.classList.remove('hidden-sticky');
      }
    }
  } else if (exerciseFloatBtn) {
    exerciseFloatBtn.classList.add('hidden-float');
  }
}

function openWorshipSummaryPage() {
  const floatBtn = document.getElementById('ibadah-floating-summary-btn');
  if (floatBtn) floatBtn.classList.add('hidden-float');

  document.querySelectorAll('.tab-page-view').forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('active');
  });

  const summaryView = document.getElementById('view-ibadah-summary');
  if (summaryView) {
    summaryView.classList.remove('hidden');
    summaryView.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
  renderWorshipSummaryPage();
}

function closeWorshipSummaryPage() {
  document.querySelectorAll('.tab-page-view').forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('active');
  });

  const ibadahView = document.getElementById('view-ibadah');
  if (ibadahView) {
    ibadahView.classList.remove('hidden');
    ibadahView.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
  renderIbadahPage();
}

// Generate last 7 date strings (YYYY-MM-DD)
function getLast7DaysDates() {
  const dates = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push({
      dateStr: `${y}-${m}-${day}`,
      dayNum: d.getDate(),
      isToday: (i === 0)
    });
  }
  return dates;
}

let isPeriodSelectorInitialized = false;

function initReportPeriodSelector() {
  if (isPeriodSelectorInitialized) return;
  isPeriodSelectorInitialized = true;

  const weeklyBtn = document.getElementById('period-btn-weekly');
  const monthlyBtn = document.getElementById('period-btn-monthly');
  const yearlyBtn = document.getElementById('period-btn-yearly');
  const buttons = [weeklyBtn, monthlyBtn, yearlyBtn];

  buttons.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        triggerHaptic('click');
        const period = btn.dataset.period;
        if (!period) return;

        currentReportPeriod = period;
        buttons.forEach(b => {
          if (b) b.classList.remove('active');
        });
        btn.classList.add('active');

        renderWorshipSummaryPage();
      });
    }
  });
}

function renderWorshipSummaryPage() {
  const dates = getLast7DaysDates();

  // 1. Render 7-Day Heatmap Matrix Grid (All 9 Prayers)
  render7DayHeatmapMatrix(dates);

  // 2. Render Weekly, Monthly, and Yearly Performance Reports
  renderPerformanceReports();
}

function render7DayHeatmapMatrix(dates) {
  const container = document.getElementById('ibadah-heatmap-grid');
  if (!container) return;

  let tableHtml = `<table class="heatmap-grid-table"><thead><tr>`;

  // Th headers for the 7 dates
  dates.forEach(dObj => {
    const label = dObj.isToday ? 'Today' : String(dObj.dayNum);
    const todayClass = dObj.isToday ? 'th-today' : '';
    tableHtml += `<th class="${todayClass}">${label}</th>`;
  });
  tableHtml += `<th class="th-prayer-name">Prayers</th></tr></thead><tbody>`;

  // Rows for ALL 9 Prayers (Tahajud, Fajr, Dhuha, Dhuhr, Asr, Maghrib, Isya, Taubat, Hajat)
  PRAYER_CONFIG.forEach(prayer => {
    tableHtml += `<tr>`;
    dates.forEach(dObj => {
      // Read ONLY actual saved user data from ibadahData
      const rec = ibadahData[dObj.dateStr];
      const status = (rec && rec.prayers && rec.prayers[prayer.key]) ? rec.prayers[prayer.key] : 'Not Prayed';

      let tileClass = 'tile-not-prayed';
      if (status === "Qada'") tileClass = 'tile-qada';
      else if (status === "Ada'") tileClass = 'tile-ada';
      else if (status === "Jama'ah") tileClass = 'tile-jamaah';

      tableHtml += `
        <td class="heatmap-cell">
          <div class="heatmap-tile ${tileClass}" title="${prayer.name} (${dObj.dateStr}): ${status}"></div>
        </td>
      `;
    });

    tableHtml += `<th class="th-prayer-name">${prayer.name}</th></tr>`;
  });

  tableHtml += `</tbody></table>`;
  container.innerHTML = tableHtml;
}

let currentReportPeriod = 'weekly'; // 'weekly' (7d), 'monthly' (30d), 'yearly' (365d)

function getPeriodDates(daysCount) {
  const dates = [];
  const today = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push({
      dateStr: `${y}-${m}-${day}`,
      dayNum: d.getDate(),
      isToday: (i === 0)
    });
  }
  return dates;
}

function renderPerformanceReports() {
  initReportPeriodSelector();

  let daysCount = 7;
  if (currentReportPeriod === 'monthly') daysCount = 30;
  else if (currentReportPeriod === 'yearly') daysCount = 365;

  const dates = getPeriodDates(daysCount);

  // ==========================================
  // 1. MANDATORY (FARD) PRAYERS METRICS
  // ==========================================
  const totalFardScheduled = daysCount * FARD_PRAYERS_KEYS.length;
  let fardJamaah = 0;
  let fardAda = 0;
  let fardQada = 0;
  let fardNotPrayed = 0;

  // ==========================================
  // 2. SUNNAH PRAYERS METRICS
  // ==========================================
  const totalSunnahScheduled = daysCount * SUNNAH_PRAYERS_KEYS.length;
  const sunnahCounts = {
    tahajud: 0,
    dhuha: 0,
    taubat: 0,
    hajat: 0
  };

  let totalQuranMins = 0;

  dates.forEach(dObj => {
    const rec = ibadahData[dObj.dateStr];
    if (rec) {
      totalQuranMins += (rec.quranDuration || 0);

      // Calculate Fard Prayers
      FARD_PRAYERS_KEYS.forEach(key => {
        const status = (rec.prayers && rec.prayers[key]) ? rec.prayers[key] : 'Not Prayed';
        if (status === "Jama'ah") fardJamaah++;
        else if (status === "Ada'") fardAda++;
        else if (status === "Qada'") fardQada++;
        else fardNotPrayed++;
      });

      // Calculate Sunnah Prayers
      SUNNAH_PRAYERS_KEYS.forEach(key => {
        const status = (rec.prayers && rec.prayers[key]) ? rec.prayers[key] : 'Not Prayed';
        if (status !== 'Not Prayed') {
          sunnahCounts[key]++;
        }
      });
    } else {
      fardNotPrayed += FARD_PRAYERS_KEYS.length;
    }
  });

  const totalFardFulfilled = fardJamaah + fardAda + fardQada;
  const fardOverallPct = Math.round((totalFardFulfilled / totalFardScheduled) * 100);

  const fardJamaahPct = Math.round((fardJamaah / totalFardScheduled) * 100);
  const fardAdaPct = Math.round((fardAda / totalFardScheduled) * 100);
  const fardQadaPct = Math.round((fardQada / totalFardScheduled) * 100);
  const fardNotPrayedPct = Math.round((fardNotPrayed / totalFardScheduled) * 100);

  // Render Fard DOM Card
  const fBadge = document.getElementById('fard-overall-badge');
  const fFill = document.getElementById('fard-progress-fill');
  const fGrid = document.getElementById('fard-stats-grid');

  if (fBadge) fBadge.textContent = `${totalFardFulfilled}/${totalFardScheduled} (${fardOverallPct}%)`;
  if (fFill) fFill.style.width = `${fardOverallPct}%`;
  if (fGrid) {
    fGrid.innerHTML = `
      <div class="stat-metric-box">
        <span class="stat-metric-val">${fardJamaah}</span>
        <span class="stat-metric-sub">${fardJamaahPct}%</span>
        <span class="stat-metric-lbl">Jama'ah</span>
      </div>
      <div class="stat-metric-box">
        <span class="stat-metric-val">${fardAda}</span>
        <span class="stat-metric-sub">${fardAdaPct}%</span>
        <span class="stat-metric-lbl">Ada' (On Time)</span>
      </div>
      <div class="stat-metric-box">
        <span class="stat-metric-val">${fardQada}</span>
        <span class="stat-metric-sub">${fardQadaPct}%</span>
        <span class="stat-metric-lbl">Qada' (Late)</span>
      </div>
      <div class="stat-metric-box">
        <span class="stat-metric-val">${fardNotPrayed}</span>
        <span class="stat-metric-sub">${fardNotPrayedPct}%</span>
        <span class="stat-metric-lbl">Not Prayed</span>
      </div>
    `;
  }

  // Render Sunnah DOM Card
  let totalSunnahFulfilled = 0;
  Object.values(sunnahCounts).forEach(cnt => totalSunnahFulfilled += cnt);
  const sunnahOverallPct = Math.round((totalSunnahFulfilled / totalSunnahScheduled) * 100);

  const sBadge = document.getElementById('sunnah-overall-badge');
  const sFill = document.getElementById('sunnah-progress-fill');
  const sGrid = document.getElementById('sunnah-stats-grid');

  if (sBadge) sBadge.textContent = `${totalSunnahFulfilled}/${totalSunnahScheduled} (${sunnahOverallPct}%)`;
  if (sFill) sFill.style.width = `${sunnahOverallPct}%`;
  if (sGrid) {
    sGrid.innerHTML = `
      <div class="stat-metric-box">
        <span class="stat-metric-val">${sunnahCounts.tahajud}</span>
        <span class="stat-metric-sub">${Math.round((sunnahCounts.tahajud / daysCount) * 100)}%</span>
        <span class="stat-metric-lbl">Tahajud</span>
      </div>
      <div class="stat-metric-box">
        <span class="stat-metric-val">${sunnahCounts.dhuha}</span>
        <span class="stat-metric-sub">${Math.round((sunnahCounts.dhuha / daysCount) * 100)}%</span>
        <span class="stat-metric-lbl">Dhuha</span>
      </div>
      <div class="stat-metric-box">
        <span class="stat-metric-val">${sunnahCounts.taubat}</span>
        <span class="stat-metric-sub">${Math.round((sunnahCounts.taubat / daysCount) * 100)}%</span>
        <span class="stat-metric-lbl">Taubat</span>
      </div>
      <div class="stat-metric-box">
        <span class="stat-metric-val">${sunnahCounts.hajat}</span>
        <span class="stat-metric-sub">${Math.round((sunnahCounts.hajat / daysCount) * 100)}%</span>
        <span class="stat-metric-lbl">Hajat</span>
      </div>
    `;
  }

  // Render Quran Duration DOM Card
  const qBadge = document.getElementById('quran-time-badge');
  const qSummary = document.getElementById('quran-stats-summary');
  const avgQuranDaily = Math.round(totalQuranMins / daysCount);

  if (qBadge) qBadge.textContent = `${totalQuranMins} Minutes Total`;
  if (qSummary) {
    qSummary.innerHTML = `
      <div class="quran-stat-item">
        <span class="quran-stat-val">${totalQuranMins} Mins</span>
        <span class="quran-stat-lbl">Total Time Spent</span>
      </div>
      <div class="quran-stat-item">
        <span class="quran-stat-val">${avgQuranDaily} Mins/Day</span>
        <span class="quran-stat-lbl">Daily Average</span>
      </div>
      <div class="quran-stat-item">
        <span class="quran-stat-val">${daysCount} Days</span>
        <span class="quran-stat-lbl">Tracked Period</span>
      </div>
    `;
  }
}

// Attach Floating Summary Scroll Listeners on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initFloatingSummaryButton();
});

// ==========================================
// FLOATING CLOUD SYNC FAB MENU & SPEED DIAL ENGINE
// ==========================================
function initFabCloudMenu() {
  const fabBtn = document.getElementById('fab-cloud-btn');
  const fabMenu = document.getElementById('fab-cloud-menu');
  const fabWrapper = document.getElementById('fab-cloud-wrapper');
  const pushBtn = document.getElementById('fab-push-btn');
  const pullBtn = document.getElementById('fab-pull-btn');
  const settingsBtn = document.getElementById('fab-settings-btn');
  const backdrop = document.getElementById('focus-backdrop');

  if (!fabBtn || !fabMenu || !fabWrapper) return;

  const toggleMenu = () => {
    triggerHaptic('click');
    const isOpen = !fabMenu.classList.contains('hidden');

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const openMenu = () => {
    fabMenu.classList.remove('hidden');
    fabWrapper.classList.add('is-open');
    if (backdrop) backdrop.classList.add('visible');
  };

  const closeMenu = () => {
    fabMenu.classList.add('hidden');
    fabWrapper.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('visible');
  };

  fabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic('click');
      closeMenu();
      openSettingsModal();
    });
  }

  if (pushBtn) {
    pushBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic('click');
      closeMenu();
      showConfirmModal({
        title: 'Upload to Google Sheets',
        message: 'Are you sure you want to upload all local tasks & worship records to Google Sheets?',
        confirmText: 'Upload Now',
        confirmBtnClass: 'btn-success',
        iconClass: 'fa-cloud-arrow-up',
        requireCheckbox: true,
        checkboxText: 'I confirm uploading local data to Google Sheets',
        onConfirm: () => {
          pushDataToGoogleSheets();
        }
      });
    });
  }

  if (pullBtn) {
    pullBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic('click');
      closeMenu();
      showConfirmModal({
        title: 'Download from Google Sheets',
        message: 'Are you sure you want to download and overwrite local data from Google Sheets?',
        confirmText: 'Download Now',
        confirmBtnClass: 'btn-info',
        iconClass: 'fa-cloud-arrow-down',
        requireCheckbox: true,
        checkboxText: 'I confirm downloading and updating data from Google Sheets',
        onConfirm: () => {
          pullDataFromGoogleSheets();
        }
      });
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (!fabMenu.classList.contains('hidden')) {
        closeMenu();
      }
    });
  }
}

// ==========================================
// STREAK & SELF-MASTERY (NOFAP) ENGINE
// ==========================================

function parseToTimestamp(dateVal) {
  if (!dateVal) return 0;
  if (dateVal instanceof Date) return dateVal.getTime();
  if (typeof dateVal === 'number') return dateVal;

  const str = String(dateVal).trim();

  // Match YYYY-MM-DD or ISO string e.g. "2026-08-16" or "2026-08-16T15:00:00"
  const matchYmd = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);

    const timeMatch = str.match(/T(\d{2}):(\d{2}):(\d{2})/);
    if (timeMatch) {
      const hh = parseInt(timeMatch[1], 10);
      const mm = parseInt(timeMatch[2], 10);
      const ss = parseInt(timeMatch[3], 10);
      return new Date(year, month, day, hh, mm, ss).getTime();
    }
    return new Date(year, month, day).getTime();
  }

  // Match DD/MM/YY or DD/MM/YYYY (e.g. "SUN, 16/08/26" or "16/08/2026")
  const matchDmy = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (matchDmy) {
    let day = parseInt(matchDmy[1], 10);
    let month = parseInt(matchDmy[2], 10) - 1;
    let year = parseInt(matchDmy[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime();
  }

  const t = new Date(str).getTime();
  return isNaN(t) ? 0 : t;
}

function formatShortDddDate(isoOrDateStr) {
  if (!isoOrDateStr) return '-';
  const ts = parseToTimestamp(isoOrDateStr);
  if (!ts) return String(isoOrDateStr);
  const d = new Date(ts);
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dayName}, ${dd}/${mm}/${yy}`;
}

function getNoFapElapsedMs() {
  if (!nofapData || !nofapData.startDate) return 0;
  const startMs = parseToTimestamp(nofapData.startDate);
  const nowMs = Date.now();
  return Math.max(0, nowMs - startMs);
}

function getNoFapCurrentStreakDays() {
  const elapsedMs = getNoFapElapsedMs();
  return Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
}

function updateNoFapLiveTimer() {
  const elapsedMs = getNoFapElapsedMs();
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const daysEl = document.getElementById('nofap-days-count');
  if (daysEl) daysEl.textContent = days;

  const breakdownEl = document.getElementById('nofap-time-breakdown');
  if (breakdownEl) {
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    breakdownEl.textContent = `${hh}h ${mm}m ${ss}s`;
  }

  if (nofapData && days > (nofapData.longestStreakDays || 0)) {
    nofapData.longestStreakDays = days;
    saveNoFapDataToStorage();
  }
}

function hasLogForDate(dateStr) {
  if (!nofapData || !nofapData.history) return false;
  return nofapData.history.some(item => item.date === dateStr);
}

function recalculateAllNoFapHistoryStreaks() {
  if (!nofapData) return;
  if (!nofapData.history) nofapData.history = [];

  // 1. Re-calculate Total Check-ins and Last Check-in Date strictly from history logs
  const checkinLogs = nofapData.history
    .filter(item => item.type === 'checkin' && item.date)
    .sort((a, b) => parseToTimestamp(b.date) - parseToTimestamp(a.date));

  nofapData.totalCheckins = checkinLogs.length;
  nofapData.lastCheckinDate = checkinLogs.length > 0 ? checkinLogs[0].date : null;

  // 2. Filter all reset/relapse items
  const resetItems = nofapData.history.filter(item => item.type === 'reset' && item.date);

  // 3. Sort chronologically ascending (oldest date first) using robust parseToTimestamp
  resetItems.sort((a, b) => parseToTimestamp(a.date) - parseToTimestamp(b.date));

  // 4. Re-calculate streak achieved prior to each relapse date
  for (let i = 0; i < resetItems.length; i++) {
    if (i === 0) {
      resetItems[i].streakDays = resetItems[i].streakDays || 0;
    } else {
      const prevMs = parseToTimestamp(resetItems[i - 1].date);
      const currMs = parseToTimestamp(resetItems[i].date);
      const diffDays = Math.max(0, Math.floor((currMs - prevMs) / (1000 * 60 * 60 * 24)));
      resetItems[i].streakDays = diffDays;
    }
  }

  // 5. Update current active startDate to the latest relapse date (newest date)
  if (resetItems.length > 0) {
    const latestRelapse = resetItems[resetItems.length - 1];
    nofapData.startDate = latestRelapse.date;
  } else if (!nofapData.startDate) {
    nofapData.startDate = new Date().toISOString();
  }

  // 6. Calculate live current streak
  const currentStreak = getNoFapCurrentStreakDays();
  let maxDays = currentStreak;

  // 7. Find max streak across history and live streak
  nofapData.history.forEach(item => {
    if (item.type === 'reset' && typeof item.streakDays === 'number') {
      if (item.streakDays > maxDays) {
        maxDays = item.streakDays;
      }
    }
  });

  nofapData.longestStreakDays = maxDays;

  // 8. Sort history back in reverse chronological order (newest date first for UI presentation)
  nofapData.history.sort((a, b) => parseToTimestamp(b.date) - parseToTimestamp(a.date));
}

function initNoFapEngine() {
  setInterval(updateNoFapLiveTimer, 1000);

  const checkinBtn = document.getElementById('nofap-checkin-btn');
  if (checkinBtn) {
    checkinBtn.addEventListener('click', openNoFapCheckinModal);
  }

  const resetBtn = document.getElementById('nofap-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', openNoFapResetModal);
  }

  const addHistoryBtn = document.getElementById('nofap-add-history-btn');
  if (addHistoryBtn) {
    addHistoryBtn.addEventListener('click', openNoFapHistoryModal);
  }

  // Check-in Modal
  const closeCheckinModalBtn = document.getElementById('close-nofap-checkin-modal');
  const cancelCheckinBtn = document.getElementById('cancel-nofap-checkin-btn');
  if (closeCheckinModalBtn) closeCheckinModalBtn.addEventListener('click', closeNoFapCheckinModal);
  if (cancelCheckinBtn) cancelCheckinBtn.addEventListener('click', closeNoFapCheckinModal);

  const checkinForm = document.getElementById('nofap-checkin-form');
  if (checkinForm) {
    checkinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const noteInput = document.getElementById('nofap-checkin-note');
      const note = noteInput ? noteInput.value : '';
      submitNoFapCheckin(note);
      closeNoFapCheckinModal();
    });
  }

  // Reset Modal
  const closeResetModalBtn = document.getElementById('close-nofap-reset-modal');
  const cancelResetBtn = document.getElementById('cancel-nofap-reset-btn');
  if (closeResetModalBtn) closeResetModalBtn.addEventListener('click', closeNoFapResetModal);
  if (cancelResetBtn) cancelResetBtn.addEventListener('click', closeNoFapResetModal);

  const resetForm = document.getElementById('nofap-reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const reasonInput = document.getElementById('nofap-reset-reason');
      const reason = reasonInput ? reasonInput.value : '';
      resetNoFapStreak(reason);
      closeNoFapResetModal();
    });
  }

  // History Modal (Past Relapse Only)
  const closeHistoryModalBtn = document.getElementById('close-nofap-history-modal');
  const cancelHistoryBtn = document.getElementById('cancel-nofap-history-btn');
  if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener('click', closeNoFapHistoryModal);
  if (cancelHistoryBtn) cancelHistoryBtn.addEventListener('click', closeNoFapHistoryModal);

  const historyForm = document.getElementById('nofap-history-form');
  if (historyForm) {
    historyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const dateEl = document.getElementById('nofap-history-date');
      const dateStr = dateEl ? dateEl.value : '';

      const noteEl = document.getElementById('nofap-history-note');
      const note = noteEl ? noteEl.value : '';

      if (submitNoFapHistoryLog(dateStr, note)) {
        closeNoFapHistoryModal();
      }
    });
  }
}

function openNoFapCheckinModal() {
  const today = getTodayDateString();
  if (nofapData.lastCheckinDate === today) {
    showToast(`You have already checked in for today (${formatShortDddDate(today)})!`, 'info');
    return;
  }
  const modal = document.getElementById('nofap-checkin-modal');
  const noteInput = document.getElementById('nofap-checkin-note');
  if (noteInput) noteInput.value = '';
  if (modal) modal.classList.remove('hidden');
}

function closeNoFapCheckinModal() {
  const modal = document.getElementById('nofap-checkin-modal');
  if (modal) modal.classList.add('hidden');
}

function submitNoFapCheckin(note = '') {
  const today = getTodayDateString();
  const currentDays = getNoFapCurrentStreakDays();

  nofapData.totalCheckins = (nofapData.totalCheckins || 0) + 1;
  nofapData.lastCheckinDate = today;

  const logItem = {
    type: 'checkin',
    date: today,
    streakDays: currentDays,
    note: note.trim() || 'Daily check-in completed'
  };

  if (!nofapData.history) nofapData.history = [];
  nofapData.history.unshift(logItem);

  saveNoFapDataToStorage();

  triggerHaptic('heavyClick');
  showToast(`Daily check-in complete! Streak: ${currentDays} Days 🔥`, 'success');
  renderNoFapPage();
}

function openNoFapResetModal() {
  const modal = document.getElementById('nofap-reset-modal');
  const reasonInput = document.getElementById('nofap-reset-reason');
  if (reasonInput) reasonInput.value = '';
  if (modal) modal.classList.remove('hidden');
}

function closeNoFapResetModal() {
  const modal = document.getElementById('nofap-reset-modal');
  if (modal) modal.classList.add('hidden');
}

function resetNoFapStreak(reason = '') {
  const nowIso = new Date().toISOString();

  const resetLog = {
    type: 'reset',
    date: nowIso,
    streakDays: 0,
    reason: reason.trim() || 'Streak reset'
  };

  if (!nofapData.history) nofapData.history = [];
  nofapData.history.unshift(resetLog);

  nofapData.lastCheckinDate = null;
  recalculateAllNoFapHistoryStreaks();

  saveNoFapDataToStorage();

  triggerHaptic('heavyClick');
  showToast('Streak reset logged. Every setback is a step towards mastery!', 'warning');
  renderNoFapPage();
}

function openNoFapHistoryModal() {
  const modal = document.getElementById('nofap-history-modal');
  const dateInput = document.getElementById('nofap-history-date');
  const noteInput = document.getElementById('nofap-history-note');

  const today = getTodayDateString();
  if (dateInput) {
    dateInput.value = today;
    dateInput.max = today;
  }
  if (noteInput) noteInput.value = '';

  if (modal) modal.classList.remove('hidden');
}

function closeNoFapHistoryModal() {
  const modal = document.getElementById('nofap-history-modal');
  if (modal) modal.classList.add('hidden');
}

function submitNoFapHistoryLog(dateStr, note) {
  if (!dateStr) {
    showToast('Please select a valid relapse date', 'warning');
    return false;
  }

  const today = getTodayDateString();
  if (dateStr > today) {
    showToast('Cannot log a relapse for a future date!', 'warning');
    return false;
  }

  const logDate = (dateStr === today) ? new Date().toISOString() : dateStr;

  const logItem = {
    type: 'reset',
    date: logDate,
    streakDays: 0,
    reason: note.trim() || 'Past streak reset'
  };

  if (!nofapData.history) nofapData.history = [];
  nofapData.history.push(logItem);

  recalculateAllNoFapHistoryStreaks();
  saveNoFapDataToStorage();

  triggerHaptic('heavyClick');
  showToast(`Past relapse log saved for ${formatShortDddDate(logDate)}!`, 'warning');
  renderNoFapPage();
  return true;
}

function renderNoFapPage() {
  if (!nofapData) return;
  updateNoFapLiveTimer();

  const currentDays = getNoFapCurrentStreakDays();

  // 1. Stats
  const longestEl = document.getElementById('nofap-longest-count');
  if (longestEl) longestEl.textContent = `${nofapData.longestStreakDays || 0} Days`;

  const checkinsEl = document.getElementById('nofap-total-checkins');
  if (checkinsEl) checkinsEl.textContent = nofapData.totalCheckins || 0;

  const startedEl = document.getElementById('nofap-started-date');
  if (startedEl) {
    startedEl.textContent = formatShortDddDate(nofapData.startDate);
  }

  // 2. Next Milestone Progress
  let nextBadge = NOFAP_BADGES.find(b => b.days > currentDays);
  if (!nextBadge) {
    nextBadge = NOFAP_BADGES[NOFAP_BADGES.length - 1];
  }

  const targetDays = nextBadge.days;
  const targetTitleEl = document.getElementById('nofap-next-milestone-title');
  if (targetTitleEl) targetTitleEl.textContent = `${nextBadge.title} (${targetDays} Days)`;

  const progressTextEl = document.getElementById('nofap-progress-text');
  if (progressTextEl) progressTextEl.textContent = `${currentDays} / ${targetDays} Days`;

  const percent = Math.min(100, Math.round((currentDays / targetDays) * 100));
  const percentEl = document.getElementById('nofap-progress-percent');
  if (percentEl) percentEl.textContent = `${percent}%`;

  const fillEl = document.getElementById('nofap-milestone-fill');
  if (fillEl) fillEl.style.width = `${percent}%`;

  // 3. Badges Grid
  const badgesGrid = document.getElementById('nofap-badges-grid');
  if (badgesGrid) {
    badgesGrid.innerHTML = NOFAP_BADGES.map(badge => {
      const isUnlocked = currentDays >= badge.days;
      const statusText = isUnlocked ? 'Unlocked' : 'Locked';
      const cardClass = isUnlocked ? 'badge-card badge-unlocked' : 'badge-card badge-locked';

      return `
        <div class="${cardClass}">
          <div class="badge-icon-box">
            <i class="fa-solid ${badge.icon}"></i>
          </div>
          <div class="badge-title">${badge.title}</div>
          <div class="badge-req">${badge.days} ${badge.days === 1 ? 'Day' : 'Days'}</div>
          <div class="badge-status-pill">${statusText}</div>
        </div>
      `;
    }).join('');
  }

  // 4. History List
  const historyList = document.getElementById('nofap-history-list');
  if (historyList) {
    if (!nofapData.history || nofapData.history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-shield-halved"></i>
          <p>No activity logs yet. Keep pushing your limits!</p>
        </div>
      `;
    } else {
      historyList.innerHTML = nofapData.history.map((item, index) => {
        const isCheckin = item.type === 'checkin';
        const iconClass = isCheckin ? 'fa-circle-check' : 'fa-rotate-left';
        const badgeClass = isCheckin ? 'history-icon-badge history-type-checkin' : 'history-icon-badge history-type-reset';
        const titleText = isCheckin ? 'Check-in' : 'Streak Reset';
        const noteText = isCheckin ? (item.note || 'Daily check-in completed') : (item.reason || 'Streak reset');
        const formattedDate = formatShortDddDate(item.date);

        return `
          <div class="nofap-history-item" data-index="${index}">
            <div class="swipe-indicator swipe-delete"><i class="fa-solid fa-trash-can"></i> Delete</div>
            <div class="history-left">
              <div class="${badgeClass}">
                <i class="fa-solid ${iconClass}"></i>
              </div>
              <div class="history-info">
                <div class="history-date">${titleText} • ${formattedDate}</div>
                <div class="history-reason">${escapeHtml(noteText)}</div>
              </div>
            </div>
            <div class="history-right-group">
              <div class="history-streak-badge">${item.streakDays || 0} Days</div>
            </div>
          </div>
        `;
      }).join('');

      // Initialize touch swipe gestures for each history item
      const itemElements = historyList.querySelectorAll('.nofap-history-item');
      itemElements.forEach((el) => {
        const idx = parseInt(el.dataset.index, 10);
        initNoFapHistorySwipe(el, idx);
      });
    }
  }
}

function deleteNoFapHistoryLog(index) {
  if (!nofapData || !nofapData.history || index < 0 || index >= nofapData.history.length) return;

  nofapData.history.splice(index, 1);
  recalculateAllNoFapHistoryStreaks();
  saveNoFapDataToStorage();

  triggerHaptic('heavyClick');
  showToast('Streak log entry deleted', 'warning');
  renderNoFapPage();
}

function initNoFapHistorySwipe(itemEl, index) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isSwiping = false;
  let thresholdTriggered = false;

  itemEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = false;
    thresholdTriggered = false;
    itemEl.style.transition = 'none';
  }, { passive: true });

  itemEl.addEventListener('touchmove', (e) => {
    const diffX = e.touches[0].clientX - startX;
    const diffY = e.touches[0].clientY - startY;

    if (!isSwiping && Math.abs(diffY) > Math.abs(diffX)) return;

    if (diffX < -10) {
      isSwiping = true;
      currentX = diffX;
      const clampedX = Math.max(-120, Math.min(0, diffX));
      itemEl.style.transform = `translateX(${clampedX}px)`;

      if (clampedX < -25) {
        itemEl.classList.add('swiping-left');
      } else {
        itemEl.classList.remove('swiping-left');
      }

      if (Math.abs(clampedX) >= 65 && !thresholdTriggered) {
        thresholdTriggered = true;
        triggerHaptic('snap');
      } else if (Math.abs(clampedX) < 65 && thresholdTriggered) {
        thresholdTriggered = false;
      }
    }
  }, { passive: true });

  itemEl.addEventListener('touchend', () => {
    itemEl.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
    if (currentX < -65) {
      triggerHaptic('heavyClick');
      itemEl.style.transform = 'translateX(-100%)';
      setTimeout(() => {
        deleteNoFapHistoryLog(index);
      }, 200);
    } else {
      itemEl.style.transform = 'translateX(0)';
      itemEl.classList.remove('swiping-left');
    }
    startX = 0;
    currentX = 0;
    isSwiping = false;
    thresholdTriggered = false;
  });
}

// ==========================================
// EXERCISE & TRAINING PROGRAM ENGINE
// ==========================================

const DEFAULT_PELARI_KALCER_PLAN = [
  // Week 1
  { id: 'ex-1-1', week: 1, day: 'Monday', date: '2025-12-08', category: 'Interval', menu: 'Interval : 8x200, Pace : RPE 8 - 9, Recovery : Jalan 200m.', status: 'Done', note: 'Finish Strong' },
  { id: 'ex-1-2', week: 1, day: 'Tuesday', date: '2025-12-09', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Done', note: '' },
  { id: 'ex-1-3', week: 1, day: 'Wednesday', date: '2025-12-10', category: 'Easy Run', menu: 'Easy Run, Pace : 7.15, 55 min', status: 'Done', note: 'Finish Strong' },
  { id: 'ex-1-4', week: 1, day: 'Thursday', date: '2025-12-11', category: 'Strength', menu: 'Core & Stability', status: 'Replaced', note: 'Replaced with Badminton' },
  { id: 'ex-1-5', week: 1, day: 'Friday', date: '2025-12-12', category: 'LSD Run', menu: 'LSD 11k, Pace : 7.15', status: 'Done', note: 'Aboot' },
  { id: 'ex-1-6', week: 1, day: 'Saturday', date: '2025-12-13', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Swap Day', note: '' },
  { id: 'ex-1-7', week: 1, day: 'Sunday', date: '2025-12-14', category: 'Rest', menu: 'Rest', status: 'Done', note: '' },

  // Week 2
  { id: 'ex-2-1', week: 2, day: 'Monday', date: '2025-12-15', category: 'Interval', menu: 'Interval : 8x200, Pace : RPE 8 - 9, Recovery : Jalan 200m.', status: 'Cancel', note: 'Hujan' },
  { id: 'ex-2-2', week: 2, day: 'Tuesday', date: '2025-12-16', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Done', note: '' },
  { id: 'ex-2-3', week: 2, day: 'Wednesday', date: '2025-12-17', category: 'Easy Run', menu: 'Easy Run, Pace : 7.15, 55 min', status: 'Done', note: '' },
  { id: 'ex-2-4', week: 2, day: 'Thursday', date: '2025-12-18', category: 'Strength', menu: 'Core & Stability', status: 'Replaced', note: 'Badminton' },
  { id: 'ex-2-5', week: 2, day: 'Friday', date: '2025-12-19', category: 'LSD Run', menu: 'LSD 11k, Pace : 7.15', status: 'Cancel', note: '' },
  { id: 'ex-2-6', week: 2, day: 'Saturday', date: '2025-12-20', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Done', note: '' },
  { id: 'ex-2-7', week: 2, day: 'Sunday', date: '2025-12-21', category: 'Rest', menu: 'Rest', status: 'Done', note: '' },

  // Week 3
  { id: 'ex-3-1', week: 3, day: 'Monday', date: '2025-12-22', category: 'Interval', menu: 'Interval : 6x400, Pace : 5.00, Recovery : Jogging Ringan 400m.', status: 'Done', note: '' },
  { id: 'ex-3-2', week: 3, day: 'Tuesday', date: '2025-12-23', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Cancel', note: '' },
  { id: 'ex-3-3', week: 3, day: 'Wednesday', date: '2025-12-24', category: 'Easy Run', menu: 'Easy Run, Pace : 7.15, 55 min', status: 'Done', note: '' },
  { id: 'ex-3-4', week: 3, day: 'Thursday', date: '2025-12-25', category: 'Strength', menu: 'Core & Stability', status: 'Replaced', note: 'Upper Body Pull' },
  { id: 'ex-3-5', week: 3, day: 'Friday', date: '2025-12-26', category: 'LSD Run', menu: 'LSD 12k, Pace : 7.00', status: 'Done', note: '' },
  { id: 'ex-3-6', week: 3, day: 'Saturday', date: '2025-12-27', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Cancel', note: '' },
  { id: 'ex-3-7', week: 3, day: 'Sunday', date: '2025-12-28', category: 'Rest', menu: 'Rest', status: 'Done', note: '' },

  // Week 4
  { id: 'ex-4-1', week: 4, day: 'Monday', date: '2025-12-29', category: 'Interval', menu: 'Interval : 6x400, Pace : 5.00, Recovery : Jogging Ringan 400m.', status: 'Replaced', note: '' },
  { id: 'ex-4-2', week: 4, day: 'Tuesday', date: '2025-12-30', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Cancel', note: '5k @29.30' },
  { id: 'ex-4-3', week: 4, day: 'Wednesday', date: '2025-12-31', category: 'Easy Run', menu: 'Easy Run, Pace : 7.15, 55 min', status: 'Replaced', note: '' },
  { id: 'ex-4-4', week: 4, day: 'Thursday', date: '2026-01-01', category: 'Strength', menu: 'Core & Stability', status: 'Cancel', note: '' },
  { id: 'ex-4-5', week: 4, day: 'Friday', date: '2026-01-02', category: 'LSD Run', menu: 'LSD 12k, Pace : 7.00', status: 'Done', note: '' },
  { id: 'ex-4-6', week: 4, day: 'Saturday', date: '2026-01-03', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Cancel', note: '' },
  { id: 'ex-4-7', week: 4, day: 'Sunday', date: '2026-01-04', category: 'Rest', menu: 'Rest', status: 'Done', note: '' },

  // Week 5
  { id: 'ex-5-1', week: 5, day: 'Monday', date: '2026-01-05', category: 'Interval', menu: 'Interval : 4x800, Pace : 6.00, Recovery : Jogging Ringan 400m.', status: 'Replaced', note: '' },
  { id: 'ex-5-2', week: 5, day: 'Tuesday', date: '2026-01-06', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Cancel', note: '5k @30.00' },
  { id: 'ex-5-3', week: 5, day: 'Wednesday', date: '2026-01-07', category: 'Easy Run', menu: 'Easy Run, Pace : 7.15, 55 min', status: 'Replaced', note: '' },
  { id: 'ex-5-4', week: 5, day: 'Thursday', date: '2026-01-08', category: 'Strength', menu: 'Core & Stability', status: 'Cancel', note: '' },
  { id: 'ex-5-5', week: 5, day: 'Friday', date: '2026-01-09', category: 'LSD Run', menu: 'LSD 14k, Pace : 7.00', status: 'Cancel', note: '' },
  { id: 'ex-5-6', week: 5, day: 'Saturday', date: '2026-01-10', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Cancel', note: '' },
  { id: 'ex-5-7', week: 5, day: 'Sunday', date: '2026-01-11', category: 'Rest', menu: 'Rest', status: 'Done', note: '' },

  // Week 6
  { id: 'ex-6-1', week: 6, day: 'Monday', date: '2026-01-12', category: 'Interval', menu: 'Interval : 4x1000, Pace : 6.00, Recovery : Jogging Ringan 400m.', status: 'Cancel', note: '' },
  { id: 'ex-6-2', week: 6, day: 'Tuesday', date: '2026-01-13', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Cancel', note: '' },
  { id: 'ex-6-3', week: 6, day: 'Wednesday', date: '2026-01-14', category: 'Tempo', menu: 'Tempo Run, Pace : 6.15, 25 Min, Warm Up 10 Min, Cooling Down 10 Min', status: 'Cancel', note: '' },
  { id: 'ex-6-4', week: 6, day: 'Thursday', date: '2026-01-15', category: 'Strength', menu: 'Core & Stability', status: 'Replaced', note: 'Badminton' },
  { id: 'ex-6-5', week: 6, day: 'Friday', date: '2026-01-16', category: 'LSD Run', menu: 'LSD 16k, Pace : 7.00', status: 'Failed', note: '13.5K @7.45' },
  { id: 'ex-6-6', week: 6, day: 'Saturday', date: '2026-01-17', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Done', note: '' },
  { id: 'ex-6-7', week: 6, day: 'Sunday', date: '2026-01-18', category: 'Rest', menu: 'Rest', status: 'Done', note: '' },

  // Week 7
  { id: 'ex-7-1', week: 7, day: 'Monday', date: '2026-01-19', category: 'Interval', menu: 'Interval : 4x1000, Pace : 6.00, Recovery : Jogging Ringan 400m.', status: 'Done', note: '' },
  { id: 'ex-7-2', week: 7, day: 'Tuesday', date: '2026-01-20', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Done', note: 'Push Only' },
  { id: 'ex-7-3', week: 7, day: 'Wednesday', date: '2026-01-21', category: 'Tempo', menu: 'Tempo Run, Pace : 6.15, 25 Min, Warm Up 10 Min, Cooling Down 10 Min', status: 'Done', note: '' },
  { id: 'ex-7-4', week: 7, day: 'Thursday', date: '2026-01-22', category: 'Strength', menu: 'Core & Stability', status: 'Replaced', note: 'Badminton' },
  { id: 'ex-7-5', week: 7, day: 'Friday', date: '2026-01-23', category: 'LSD Run', menu: 'LSD 16k, Pace : 7.00', status: 'Done', note: '16K @7.43' },
  { id: 'ex-7-6', week: 7, day: 'Saturday', date: '2026-01-24', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Done', note: '' },
  { id: 'ex-7-7', week: 7, day: 'Sunday', date: '2026-01-25', category: 'Rest', menu: 'Rest', status: 'Pending', note: '' },

  // Week 8
  { id: 'ex-8-1', week: 8, day: 'Monday', date: '2026-01-26', category: 'Interval', menu: 'Interval : 4x1000, Pace : 5.40, Recovery : Jogging Ringan 400m.', status: 'Cancel', note: '' },
  { id: 'ex-8-2', week: 8, day: 'Tuesday', date: '2026-01-27', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Cancel', note: '' },
  { id: 'ex-8-3', week: 8, day: 'Wednesday', date: '2026-01-28', category: 'Tempo', menu: 'Tempo Run, Pace : 6.00, 30 Min, Warm Up 10 Min, Cooling Down 10 Min', status: 'Cancel', note: '' },
  { id: 'ex-8-4', week: 8, day: 'Thursday', date: '2026-01-29', category: 'Strength', menu: 'Core & Stability', status: 'Cancel', note: '' },
  { id: 'ex-8-5', week: 8, day: 'Friday', date: '2026-01-30', category: 'LSD Run', menu: 'LSD 19k, Pace : 6.45', status: 'Replaced', note: '5K easy' },
  { id: 'ex-8-6', week: 8, day: 'Saturday', date: '2026-01-31', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Done', note: '' },
  { id: 'ex-8-7', week: 8, day: 'Sunday', date: '2026-02-01', category: 'Rest', menu: 'Rest', status: 'Done', note: '' },

  // Week 9
  { id: 'ex-9-1', week: 9, day: 'Monday', date: '2026-02-02', category: 'Interval', menu: 'Interval : 4x1000, Pace : 5.40, Recovery : Jogging Ringan 400m.', status: 'Cancel', note: '' },
  { id: 'ex-9-2', week: 9, day: 'Tuesday', date: '2026-02-03', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Cancel', note: '' },
  { id: 'ex-9-3', week: 9, day: 'Wednesday', date: '2026-02-04', category: 'Tempo', menu: 'Tempo Run, Pace : 6.00, 30 Min, Warm Up 10 Min, Cooling Down 10 Min', status: 'Cancel', note: '' },
  { id: 'ex-9-4', week: 9, day: 'Thursday', date: '2026-02-05', category: 'Strength', menu: 'Core & Stability', status: 'Cancel', note: '' },
  { id: 'ex-9-5', week: 9, day: 'Friday', date: '2026-02-06', category: 'LSD Run', menu: 'LSD 19k, Pace : 6.45', status: 'Cancel', note: '' },
  { id: 'ex-9-6', week: 9, day: 'Saturday', date: '2026-02-07', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Cancel', note: '' },
  { id: 'ex-9-7', week: 9, day: 'Sunday', date: '2026-02-08', category: 'Rest', menu: 'Rest', status: 'Done', note: '' },

  // Week 10
  { id: 'ex-10-1', week: 10, day: 'Monday', date: '2026-02-09', category: 'Tempo', menu: 'Race Simulation, 5k, Pace : 5.45', status: 'Pending', note: '' },
  { id: 'ex-10-2', week: 10, day: 'Tuesday', date: '2026-02-10', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Pending', note: '' },
  { id: 'ex-10-3', week: 10, day: 'Wednesday', date: '2026-02-11', category: 'Easy Run', menu: 'Easy Run, Pace : 7.00, 45 Min', status: 'Pending', note: '' },
  { id: 'ex-10-4', week: 10, day: 'Thursday', date: '2026-02-12', category: 'Strength', menu: 'Core & Stability', status: 'Pending', note: '' },
  { id: 'ex-10-5', week: 10, day: 'Friday', date: '2026-02-13', category: 'LSD Run', menu: 'LSD 15k, Pace : 6.30', status: 'Pending', note: '' },
  { id: 'ex-10-6', week: 10, day: 'Saturday', date: '2026-02-14', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Pending', note: '' },
  { id: 'ex-10-7', week: 10, day: 'Sunday', date: '2026-02-15', category: 'Rest', menu: 'Rest', status: 'Pending', note: '' },

  // Week 11
  { id: 'ex-11-1', week: 11, day: 'Monday', date: '2026-02-16', category: 'Interval', menu: 'Interval : 8x400, Pace : 5.00, Recovery : Jalan 400m.', status: 'Pending', note: '' },
  { id: 'ex-11-2', week: 11, day: 'Tuesday', date: '2026-02-17', category: 'Strength', menu: 'Upper Body (Push) + Lower Body (Strength)', status: 'Pending', note: '' },
  { id: 'ex-11-3', week: 11, day: 'Wednesday', date: '2026-02-18', category: 'Easy Run', menu: 'Easy Run, Pace : 6.45, 40 Min', status: 'Pending', note: '' },
  { id: 'ex-11-4', week: 11, day: 'Thursday', date: '2026-02-19', category: 'Strength', menu: 'Core & Stability', status: 'Pending', note: '' },
  { id: 'ex-11-5', week: 11, day: 'Friday', date: '2026-02-20', category: 'LSD Run', menu: 'LSD 22k, Pace : 6.30', status: 'Pending', note: '' },
  { id: 'ex-11-6', week: 11, day: 'Saturday', date: '2026-02-21', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Pending', note: '' },
  { id: 'ex-11-7', week: 11, day: 'Sunday', date: '2026-02-22', category: 'Rest', menu: 'Rest', status: 'Pending', note: '' },

  // Week 12
  { id: 'ex-12-1', week: 12, day: 'Monday', date: '2026-02-23', category: 'Interval', menu: 'Interval : 4x200, Pace : 9+, Recovery : Jalan 400m.', status: 'Pending', note: '' },
  { id: 'ex-12-2', week: 12, day: 'Tuesday', date: '2026-02-24', category: 'Strength', menu: 'Upper Body (Push) + Mobility (Light)', status: 'Pending', note: '' },
  { id: 'ex-12-3', week: 12, day: 'Wednesday', date: '2026-02-25', category: 'Easy Run', menu: 'Easy Run, Pace : 7.00, 25 Min', status: 'Pending', note: '' },
  { id: 'ex-12-4', week: 12, day: 'Thursday', date: '2026-02-26', category: 'Strength', menu: 'Core & Stability (Very Light)', status: 'Pending', note: '' },
  { id: 'ex-12-5', week: 12, day: 'Friday', date: '2026-02-27', category: 'LSD Run', menu: 'LSD 24k, Pace : 6.30', status: 'Pending', note: '' },
  { id: 'ex-12-6', week: 12, day: 'Saturday', date: '2026-02-28', category: 'Strength', menu: 'Upper Body (Pull) + Flexibility', status: 'Pending', note: '' },
  { id: 'ex-12-7', week: 12, day: 'Sunday', date: '2026-03-01', category: 'Rest', menu: 'Rest', status: 'Pending', note: '' }
];

function initDefaultExerciseData() {
  exerciseData = {
    programTitle: 'Road to Pelari Kalcer',
    selectedWeek: 'ALL',
    workouts: DEFAULT_PELARI_KALCER_PLAN
  };
  saveExerciseDataToStorage();
}

function initExerciseEngine() {
  const btnSettings = document.getElementById('btn-open-exercise-settings');
  if (btnSettings) btnSettings.addEventListener('click', openExerciseSettingsModal);

  const btnAdd = document.getElementById('btn-add-workout');
  if (btnAdd) btnAdd.addEventListener('click', openAddWorkoutModal);

  const closeSettingsModal = document.getElementById('close-exercise-settings-modal');
  if (closeSettingsModal) closeSettingsModal.addEventListener('click', closeExerciseSettingsModal);

  const closeGeminiModal = document.getElementById('close-exercise-gemini-modal');
  if (closeGeminiModal) closeGeminiModal.addEventListener('click', closeGeminiImportModal);

  const cancelGeminiBtn = document.getElementById('cancel-exercise-gemini-btn');
  if (cancelGeminiBtn) cancelGeminiBtn.addEventListener('click', closeGeminiImportModal);

  const confirmGeminiBtn = document.getElementById('confirm-exercise-gemini-btn');
  if (confirmGeminiBtn) confirmGeminiBtn.addEventListener('click', submitGeminiImportJson);

  const closeEditModal = document.getElementById('close-exercise-edit-modal');
  if (closeEditModal) closeEditModal.addEventListener('click', closeExerciseEditModal);

  const cancelEditBtn = document.getElementById('cancel-exercise-edit-btn');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeExerciseEditModal);

  const editForm = document.getElementById('exercise-edit-form');
  if (editForm) editForm.addEventListener('submit', handleSaveExerciseEdit);

  const dateInput = document.getElementById('exercise-edit-date');
  const dateDisplay = document.getElementById('exercise-edit-date-display');
  if (dateInput && dateDisplay) {
    const updateDisplay = () => {
      if (dateInput.value) {
        dateDisplay.value = formatWorkoutModalDate(dateInput.value);
      }
    };
    dateInput.addEventListener('change', updateDisplay);
    dateInput.addEventListener('input', updateDisplay);
  }

  const settingsDateInput = document.getElementById('exercise-settings-start-date');
  const settingsDateDisplay = document.getElementById('exercise-settings-start-date-display');
  if (settingsDateInput && settingsDateDisplay) {
    const updateSettingsDateDisplay = () => {
      if (settingsDateInput.value) {
        settingsDateDisplay.value = formatWorkoutModalDate(settingsDateInput.value);
      }
    };
    settingsDateInput.addEventListener('change', updateSettingsDateDisplay);
    settingsDateInput.addEventListener('input', updateSettingsDateDisplay);
  }
}

function formatWorkoutModalDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(dateObj.getTime())) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dateObj.getDay()];
      const yy = year.slice(-2);
      return `${dayName}, ${day}/${month}/${yy}`;
    }
  }
  return dateStr;
}

function parseWorkoutModalDate(formattedStr) {
  if (!formattedStr) return { isoDate: getTodayDateString(), dayName: 'Monday' };

  if (/^\d{4}-\d{2}-\d{2}$/.test(formattedStr.trim())) {
    const isoDate = formattedStr.trim();
    const [y, m, d] = isoDate.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    const dayName = !isNaN(dateObj.getTime()) ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()] : 'Monday';
    return { isoDate, dayName };
  }

  const match = formattedStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = '20' + year;
    }
    const isoDate = `${year}-${month}-${day}`;
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const dayName = !isNaN(dateObj.getTime()) ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()] : 'Monday';
    return { isoDate, dayName };
  }

  return { isoDate: getTodayDateString(), dayName: 'Monday' };
}

function sortExerciseWorkouts() {
  if (!exerciseData || !exerciseData.workouts) return;
  exerciseData.workouts.sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    const weekA = parseInt(a.week) || 0;
    const weekB = parseInt(b.week) || 0;
    if (weekA !== weekB) return weekA - weekB;
    return 0;
  });
}

function renderExercisePage() {
  if (!exerciseData || !exerciseData.workouts) {
    initDefaultExerciseData();
  }

  sortExerciseWorkouts();
  renderTodayWorkoutHero();
  renderExerciseWeekPills();
  renderExerciseWorkoutList();
  updateFloatingSummaryButtonState();
  updateFabAddWorkoutVisibility();
}

function renderTodayWorkoutHero() {
  const todayStr = getTodayDateString();
  const workouts = exerciseData.workouts || [];

  const titleEl = document.getElementById('exercise-program-title');
  if (titleEl) titleEl.textContent = exerciseData.programTitle || 'Road to Pelari Kalcer';

  // Find exact workout entry for TODAY by date
  const todayWorkout = workouts.find(w => w.date === todayStr);

  // Find upcoming pending workout (after today or nearest pending)
  const upcomingWorkout = workouts.find(w => w.status === 'Pending' && (w.date ? w.date >= todayStr : true)) || workouts.find(w => w.status === 'Pending');

  const activeWeekPill = document.getElementById('exercise-active-week-pill');
  if (activeWeekPill) {
    const totalWeeks = getTotalProgramWeeks();
    const currentWeek = todayWorkout ? todayWorkout.week : (upcomingWorkout ? upcomingWorkout.week : 1);
    activeWeekPill.textContent = `Week ${currentWeek} of ${totalWeeks}`;
  }

  const dateBadge = document.getElementById('exercise-today-date-badge');
  if (dateBadge) {
    dateBadge.textContent = formatShortDddDate(todayStr);
  }

  const labelEl = document.getElementById('exercise-hero-label');
  const menuEl = document.getElementById('exercise-today-menu');
  const heroStatusBox = document.getElementById('exercise-hero-status-box');
  const heroStatusSelect = document.getElementById('exercise-hero-status-select');
  const upcomingPreviewEl = document.getElementById('exercise-upcoming-preview');
  const nextDateTag = document.getElementById('exercise-next-date-tag');
  const nextMenuEl = document.getElementById('exercise-next-menu');

  // Case 1: Today HAS a workout and it is NOT done yet
  if (todayWorkout && todayWorkout.status !== 'Done' && (todayWorkout.category || '').toLowerCase() !== 'rest') {
    if (labelEl) labelEl.innerHTML = `<i class="fa-solid fa-crosshair"></i> TODAY'S WORKOUT TARGET`;
    if (menuEl) menuEl.textContent = todayWorkout.menu || 'Active Workout';
    if (heroStatusBox) heroStatusBox.style.display = 'flex';
    if (heroStatusSelect) heroStatusSelect.value = todayWorkout.status || 'Pending';
    if (upcomingPreviewEl) upcomingPreviewEl.classList.add('hidden');
  } 
  // Case 2: Today's workout is already COMPLETED (status === 'Done')
  else if (todayWorkout && todayWorkout.status === 'Done') {
    if (labelEl) labelEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #34d399;"></i> TODAY'S TARGET COMPLETED`;
    if (menuEl) menuEl.innerHTML = `<span style="opacity: 0.85; text-decoration: line-through;">${escapeHtml(todayWorkout.menu)}</span> <span style="font-size: 14px; font-weight: 800; color: #34d399; margin-left: 6px;">Done! 🎉</span>`;
    if (heroStatusBox) heroStatusBox.style.display = 'flex';
    if (heroStatusSelect) heroStatusSelect.value = 'Done';
    
    // Show upcoming preview if available
    if (upcomingWorkout && upcomingWorkout.id !== todayWorkout.id) {
      if (upcomingPreviewEl) upcomingPreviewEl.classList.remove('hidden');
      if (nextDateTag) nextDateTag.textContent = `W${upcomingWorkout.week} • ${formatShortDddDate(upcomingWorkout.date)}`;
      if (nextMenuEl) nextMenuEl.textContent = upcomingWorkout.menu;
    } else if (upcomingPreviewEl) {
      upcomingPreviewEl.classList.add('hidden');
    }
  } 
  // Case 3: No workout scheduled for today OR Category is 'Rest'
  else {
    const isRestCat = todayWorkout && (todayWorkout.category || '').toLowerCase() === 'rest';
    if (labelEl) labelEl.innerHTML = `<i class="fa-solid fa-mug-hot" style="color: var(--c-amber);"></i> RECOVERY & REST DAY`;
    if (menuEl) menuEl.textContent = isRestCat && todayWorkout.menu ? todayWorkout.menu : 'Enjoy Your Rest Day! ☕ Rest & Recovery';
    if (todayWorkout && heroStatusBox) {
      heroStatusBox.style.display = 'flex';
      if (heroStatusSelect) heroStatusSelect.value = todayWorkout.status;
    } else if (heroStatusBox) {
      heroStatusBox.style.display = 'none';
    }

    // Show upcoming preview if available
    if (upcomingWorkout) {
      if (upcomingPreviewEl) upcomingPreviewEl.classList.remove('hidden');
      if (nextDateTag) nextDateTag.textContent = `W${upcomingWorkout.week} • ${formatShortDddDate(upcomingWorkout.date)}`;
      if (nextMenuEl) nextMenuEl.textContent = upcomingWorkout.menu;
    } else if (upcomingPreviewEl) {
      upcomingPreviewEl.classList.add('hidden');
    }
  }

  // Lock hero status select if target date is in the future
  if (heroStatusSelect) {
    const isFutureTarget = todayWorkout && todayWorkout.date && todayWorkout.date > todayStr;
    if (isFutureTarget) {
      heroStatusSelect.disabled = true;
      heroStatusSelect.title = 'Status locked until workout date arrives';
      heroStatusSelect.classList.add('disabled-future-select');
    } else {
      heroStatusSelect.disabled = false;
      heroStatusSelect.removeAttribute('title');
      heroStatusSelect.classList.remove('disabled-future-select');
    }
  }

  // Calculate Progress Stats
  const completedCount = workouts.filter(w => w.status === 'Done').length;
  const totalCount = workouts.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const pctEl = document.getElementById('exercise-progress-percent');
  if (pctEl) pctEl.textContent = `${progressPct}%`;

  const heroPctText = document.getElementById('exercise-hero-pct-text');
  if (heroPctText) heroPctText.textContent = `${progressPct}%`;

  const fillEl = document.getElementById('exercise-hero-progress-fill');
  if (fillEl) fillEl.style.width = `${progressPct}%`;

  const doneCountEl = document.getElementById('exercise-completed-count');
  if (doneCountEl) doneCountEl.textContent = `${completedCount} / ${totalCount}`;
}

function changeTodayWorkoutStatus(newStatus) {
  const todayStr = getTodayDateString();
  const workouts = exerciseData.workouts || [];
  const todayWorkout = workouts.find(w => w.date === todayStr);
  if (!todayWorkout) return;

  changeWorkoutStatus(todayWorkout.id, newStatus);
}

function getTotalProgramWeeks() {
  const workouts = (exerciseData && exerciseData.workouts) ? exerciseData.workouts : [];
  if (workouts.length === 0) return 12;

  let maxWeek = 1;
  workouts.forEach(w => {
    const weekNum = parseInt(w.week, 10);
    if (!isNaN(weekNum) && weekNum > maxWeek) {
      maxWeek = weekNum;
    }
  });
  return maxWeek;
}

function renderExerciseWeekPills() {
  const pillsContainer = document.getElementById('exercise-week-pills');
  if (!pillsContainer) return;

  const selectedWeek = exerciseData.selectedWeek || 'ALL';
  const totalWeeks = getTotalProgramWeeks();

  let html = `<div class="week-pill ${selectedWeek === 'ALL' ? 'active' : ''}" data-week="ALL">All Weeks</div>`;
  for (let w = 1; w <= totalWeeks; w++) {
    html += `<div class="week-pill ${selectedWeek == w ? 'active' : ''}" data-week="${w}">Week ${w}</div>`;
  }

  pillsContainer.innerHTML = html;

  pillsContainer.querySelectorAll('.week-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      triggerHaptic('click');
      exerciseData.selectedWeek = pill.dataset.week;
      saveExerciseDataToStorage();
      renderExerciseWeekPills();
      renderExerciseWorkoutList();
    });
  });
}

function getCategoryClass(category) {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('interval')) return 'cat-interval';
  if (cat.includes('strength') || cat.includes('push') || cat.includes('pull')) return 'cat-strength';
  if (cat.includes('easy')) return 'cat-easy-run';
  if (cat.includes('lsd')) return 'cat-lsd-run';
  if (cat.includes('tempo') || cat.includes('race')) return 'cat-tempo';
  return 'cat-rest';
}

function getStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'done') return 'workout-status-done';
  if (s === 'cancel') return 'workout-status-cancel';
  if (s === 'replaced') return 'workout-status-replaced';
  if (s === 'failed') return 'workout-status-failed';
  if (s === 'swap day' || s === 'swap') return 'workout-status-swap';
  return 'workout-status-pending';
}

function renderExerciseWorkoutList() {
  const listContainer = document.getElementById('exercise-workout-list');
  const subtitleEl = document.getElementById('exercise-matrix-subtitle');
  if (!listContainer) return;

  const selectedWeek = exerciseData.selectedWeek || 'ALL';
  let workouts = exerciseData.workouts || [];
  const totalWeeks = getTotalProgramWeeks();

  if (selectedWeek !== 'ALL') {
    workouts = workouts.filter(w => String(w.week) === String(selectedWeek));
    if (subtitleEl) subtitleEl.textContent = `Showing Week ${selectedWeek} workouts (${workouts.length} days)`;
  } else {
    if (subtitleEl) subtitleEl.textContent = `Showing all ${totalWeeks} weeks program (${workouts.length} workouts)`;
  }

  if (workouts.length === 0) {
    listContainer.innerHTML = `<div class="empty-state">No workouts found for Week ${selectedWeek}.</div>`;
    return;
  }

  const todayStr = getTodayDateString();

  let html = '';
  workouts.forEach(item => {
    const isToday = item.date === todayStr;
    const isFuture = item.date && item.date > todayStr;
    const catClass = getCategoryClass(item.category);
    const statusClass = getStatusClass(item.status);
    const dateFormatted = formatShortDddDate(item.date || item.day);

    html += `
      <div class="workout-card-wrapper" data-id="${item.id}">
        <div class="swipe-indicator swipe-edit"><i class="fa-solid fa-pen"></i> Edit</div>
        <div class="swipe-indicator swipe-delete"><i class="fa-solid fa-trash"></i> Delete</div>
        <div class="workout-card ${catClass} ${isToday ? 'active-workout is-today' : ''}" id="workout-card-${item.id}">
          <div class="workout-card-header">
            <div class="workout-date-group">
              <span class="workout-week-tag">W${item.week}</span>
              <span class="workout-date-text">${dateFormatted}</span>
              ${isToday ? '<span class="workout-active-badge"><i class="fa-solid fa-fire"></i> ACTIVE TODAY</span>' : ''}
            </div>
            <span class="workout-type-pill ${catClass}">${item.category || 'Workout'}</span>
          </div>
          <div class="workout-card-body">
            ${escapeHtml(item.menu)}
          </div>
          <div class="workout-card-footer">
            <div class="workout-note-text" onclick="editWorkoutNote('${item.id}')" style="cursor: pointer;" title="Tap to add or edit performance note">
              ${item.note ? `<i class="fa-solid fa-note-sticky"></i> ${escapeHtml(item.note)}` : '<span style="opacity:0.5;">+ Add Note</span>'}
            </div>
            <select class="workout-status-select ${statusClass} ${isFuture ? 'disabled-future-select' : ''}" ${isFuture ? 'disabled title="Status locked until workout date arrives"' : ''} onchange="changeWorkoutStatus('${item.id}', this.value)">
              <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Done" ${item.status === 'Done' ? 'selected' : ''}>Done</option>
              <option value="Cancel" ${item.status === 'Cancel' ? 'selected' : ''}>Cancel</option>
              <option value="Replaced" ${item.status === 'Replaced' ? 'selected' : ''}>Replaced</option>
              <option value="Failed" ${item.status === 'Failed' ? 'selected' : ''}>Failed</option>
              <option value="Swap Day" ${item.status === 'Swap Day' ? 'selected' : ''}>Swap Day</option>
            </select>
          </div>
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html;

  // Bind Touch Swipe Gestures to each workout card
  listContainer.querySelectorAll('.workout-card-wrapper').forEach(wrapper => {
    initWorkoutSwipeGesture(wrapper, wrapper.dataset.id);
  });
}

function initWorkoutSwipeGesture(rowEl, id) {
  const cardEl = rowEl.querySelector('.workout-card') || rowEl;

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isSwiping = false;
  let thresholdTriggered = false;

  cardEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = false;
    thresholdTriggered = false;
    cardEl.style.transition = 'none';
  }, { passive: true });

  cardEl.addEventListener('touchmove', (e) => {
    const diffX = e.touches[0].clientX - startX;
    const diffY = e.touches[0].clientY - startY;

    if (!isSwiping && Math.abs(diffY) > Math.abs(diffX)) return;

    if (Math.abs(diffX) > 10) {
      isSwiping = true;
      currentX = diffX;
      const clampedX = Math.max(-120, Math.min(120, diffX));
      cardEl.style.transform = `translateX(${clampedX}px)`;

      if (clampedX > 25) {
        rowEl.classList.add('swiping-right');
        rowEl.classList.remove('swiping-left');
      } else if (clampedX < -25) {
        rowEl.classList.add('swiping-left');
        rowEl.classList.remove('swiping-right');
      } else {
        rowEl.classList.remove('swiping-right', 'swiping-left');
      }

      if (Math.abs(clampedX) >= 65 && !thresholdTriggered) {
        thresholdTriggered = true;
        triggerHaptic('snap');
      } else if (Math.abs(clampedX) < 65 && thresholdTriggered) {
        thresholdTriggered = false;
      }
    }
  }, { passive: true });

  cardEl.addEventListener('touchend', () => {
    cardEl.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), background 0.22s ease';
    if (currentX > 65) {
      triggerHaptic('click');
      cardEl.style.transform = 'translateX(0)';
      rowEl.classList.remove('swiping-right', 'swiping-left');
      openExerciseEditModal(id);
    } else if (currentX < -65) {
      triggerHaptic('heavyClick');
      cardEl.style.transform = 'translateX(-100%)';
      setTimeout(() => {
        deleteExerciseWorkout(id);
      }, 200);
    } else {
      cardEl.style.transform = 'translateX(0)';
      rowEl.classList.remove('swiping-right', 'swiping-left');
    }
    startX = 0;
    currentX = 0;
    isSwiping = false;
    thresholdTriggered = false;
  });
}

function changeWorkoutStatus(id, newStatus) {
  triggerHaptic('click');
  const workout = exerciseData.workouts.find(w => w.id === id);
  if (!workout) return;

  const todayStr = getTodayDateString();
  if (workout.date && workout.date > todayStr) {
    showToast('Status is locked until the workout date arrives!', 'warning');
    renderExerciseWorkoutList();
    return;
  }

  workout.status = newStatus;
  saveExerciseDataToStorage();
  renderTodayWorkoutHero();
  renderExerciseWorkoutList();
  showToast(`Workout status updated to ${newStatus}`, 'success');
}

function editWorkoutNote(id) {
  triggerHaptic('click');
  const workout = exerciseData.workouts.find(w => w.id === id);
  if (!workout) return;

  const noteIdInput = document.getElementById('exercise-note-id');
  const noteTextInput = document.getElementById('exercise-note-text');
  const modal = document.getElementById('exercise-note-modal');

  if (noteIdInput) noteIdInput.value = workout.id;
  if (noteTextInput) noteTextInput.value = workout.note || '';
  if (modal) modal.classList.remove('hidden');
}

function closeExerciseNoteModal() {
  const modal = document.getElementById('exercise-note-modal');
  if (modal) modal.classList.add('hidden');
}

function handleSaveExerciseNote(e) {
  e.preventDefault();
  triggerHaptic('click');
  const id = document.getElementById('exercise-note-id').value;
  const noteVal = document.getElementById('exercise-note-text').value.trim();

  const workout = exerciseData.workouts.find(w => w.id === id);
  if (workout) {
    workout.note = noteVal;
    saveExerciseDataToStorage();
    renderExercisePage();
    closeExerciseNoteModal();
    showToast(noteVal ? 'Performance note saved!' : 'Performance note cleared.', 'info');
  }
}

function openExerciseEditModal(id) {
  triggerHaptic('click');
  const workout = exerciseData.workouts.find(w => w.id === id);
  if (!workout) return;

  const titleEl = document.getElementById('modal-exercise-edit-title');
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Workout Entry';

  const targetDate = workout.date || getTodayDateString();
  document.getElementById('exercise-edit-id').value = workout.id;
  document.getElementById('exercise-edit-is-new').value = 'false';

  const dateInput = document.getElementById('exercise-edit-date');
  const dateDisplay = document.getElementById('exercise-edit-date-display');
  if (dateInput) dateInput.value = targetDate;
  if (dateDisplay) dateDisplay.value = formatWorkoutModalDate(targetDate);

  document.getElementById('exercise-edit-category').value = workout.category || 'Interval';
  document.getElementById('exercise-edit-menu').value = workout.menu || '';

  document.getElementById('exercise-edit-modal').classList.remove('hidden');
}

function closeExerciseEditModal() {
  document.getElementById('exercise-edit-modal').classList.add('hidden');
}

function handleSaveExerciseEdit(e) {
  e.preventDefault();
  triggerHaptic('click');
  const id = document.getElementById('exercise-edit-id').value;
  const isNew = document.getElementById('exercise-edit-is-new').value === 'true';

  const category = document.getElementById('exercise-edit-category').value;
  const menu = document.getElementById('exercise-edit-menu').value.trim() || 'Custom Workout';

  const dateInput = document.getElementById('exercise-edit-date');
  const dateDisplay = document.getElementById('exercise-edit-date-display');
  const rawDateVal = (dateInput && dateInput.value) ? dateInput.value : (dateDisplay ? dateDisplay.value : '');
  const { isoDate, dayName } = parseWorkoutModalDate(rawDateVal);

  if (isNew) {
    const weekNum = (exerciseData && exerciseData.selectedWeek && exerciseData.selectedWeek !== 'ALL') ? parseInt(exerciseData.selectedWeek) : 1;

    const newWorkout = {
      id: id,
      week: weekNum,
      day: dayName,
      date: isoDate,
      category: category,
      menu: menu,
      status: 'Pending',
      note: ''
    };
    if (!exerciseData.workouts) exerciseData.workouts = [];
    exerciseData.workouts.push(newWorkout);
  } else {
    const workout = exerciseData.workouts.find(w => w.id === id);
    if (!workout) return;
    workout.category = category;
    workout.menu = menu;
    workout.date = isoDate;
    workout.day = dayName;
  }

  sortExerciseWorkouts();
  saveExerciseDataToStorage();
  closeExerciseEditModal();
  renderExercisePage();
  showToast(isNew ? 'New workout entry added successfully!' : 'Workout entry updated successfully!', 'success');
}

function deleteExerciseWorkout(id) {
  triggerHaptic('click');
  const workout = exerciseData.workouts.find(w => w.id === id);
  if (!workout) return;

  showConfirmModal({
    title: 'Delete Workout Entry',
    message: `Are you sure you want to delete "${workout.menu}" (${workout.day || ''})?`,
    confirmText: 'Delete',
    iconClass: 'fa-trash',
    onConfirm: () => {
      exerciseData.workouts = exerciseData.workouts.filter(w => w.id !== id);
      saveExerciseDataToStorage();
      renderExercisePage();
      showToast('Workout entry deleted.', 'info');
    }
  });
}

function openAddWorkoutModal() {
  triggerHaptic('click');
  const id = `ex-custom-${Date.now()}`;

  const titleEl = document.getElementById('modal-exercise-edit-title');
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-plus"></i> Add New Workout Entry';

  const todayIso = getTodayDateString();
  document.getElementById('exercise-edit-id').value = id;
  document.getElementById('exercise-edit-is-new').value = 'true';

  const dateInput = document.getElementById('exercise-edit-date');
  const dateDisplay = document.getElementById('exercise-edit-date-display');
  if (dateInput) dateInput.value = todayIso;
  if (dateDisplay) dateDisplay.value = formatWorkoutModalDate(todayIso);

  document.getElementById('exercise-edit-category').value = 'Interval';
  document.getElementById('exercise-edit-menu').value = '';

  document.getElementById('exercise-edit-modal').classList.remove('hidden');
}

function copyGeminiPrompt() {
  triggerHaptic('click');

  const title = (document.getElementById('exercise-settings-program-title')?.value || (exerciseData && exerciseData.programTitle) || 'Road to Pelari Kalcer').trim();
  const startDateInput = document.getElementById('exercise-settings-start-date')?.value || (exerciseData && exerciseData.programStartDate) || getTodayDateString();
  const weeks = document.getElementById('exercise-settings-program-weeks')?.value || (exerciseData && exerciseData.programWeeks) || '12';
  const goal = document.getElementById('exercise-settings-program-goal')?.value || (exerciseData && exerciseData.programGoal) || 'Half Marathon (21K) & Endurance';
  const level = document.getElementById('exercise-settings-fitness-level')?.value || (exerciseData && exerciseData.fitnessLevel) || 'Intermediate (Pace 6:00 - 7:30 min/km)';
  const daysPerWeek = document.getElementById('exercise-settings-days-per-week')?.value || (exerciseData && exerciseData.trainingDaysPerWeek) || '6 Days (Mon-Sat, Sun Rest)';
  const customNotes = (document.getElementById('exercise-settings-custom-notes')?.value || (exerciseData && exerciseData.customNotes) || '').trim();

  const formattedStartDate = formatWorkoutModalDate(startDateInput);

  const promptText = `Act as an expert running coach and strength conditioning trainer. Generate a structured, progressive workout plan in JSON format for me.

Program Parameters:
- Program Title: "${title}"
- Program Start Date: ${startDateInput} (${formattedStartDate}) [IMPORTANT: Compute accurate calendar dates ("date": "YYYY-MM-DD") sequentially for each session starting from this date]
- Program Duration: ${weeks} Weeks
- Primary Goal: ${goal}
- Current Fitness Level: ${level}
- Training Frequency: ${daysPerWeek}
${customNotes ? `- Custom Notes / Specific Focus: ${customNotes}` : ''}

Output Requirements:
The output MUST be valid JSON (an array of objects) with NO markdown fences or additional conversational text, matching this exact schema:

[
  {
    "week": 1,
    "day": "Monday",
    "date": "${startDateInput}",
    "category": "Interval",
    "menu": "Interval : 8x200m, Pace : RPE 8 - 9, Recovery : Jog/Walk 200m",
    "status": "Pending",
    "note": ""
  }
]

Allowed Categories: "Interval", "Strength", "Easy Run", "LSD Run", "Tempo", "Rest".

Requirements:
1. Generate complete progressive schedule for all ${weeks} weeks starting from ${startDateInput}.
2. Ensure every object has valid "week" (integer 1 to ${weeks}), "day" (Monday-Sunday), "date" (YYYY-MM-DD corresponding to the actual calendar day), "category" (from allowed list), "menu" (actionable training details with pace/sets/reps), "status" ("Pending"), and "note" ("").`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(promptText)
      .then(() => showToast('Gemini AI Prompt with custom parameters copied!', 'success'))
      .catch(() => fallbackCopyPrompt(promptText));
  } else {
    fallbackCopyPrompt(promptText);
  }
}

function fallbackCopyPrompt(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('Gemini AI Prompt copied to clipboard!', 'success');
  } catch (err) {
    showToast('Gemini AI Prompt copied to clipboard!', 'success');
  }
  document.body.removeChild(textarea);
}

function openGeminiImportModal() {
  triggerHaptic('click');
  // Hide settings modal to prevent stacking/backdrop conflict
  const settingsModal = document.getElementById('exercise-settings-modal');
  if (settingsModal) settingsModal.classList.add('hidden');

  document.getElementById('gemini-json-input').value = '';
  document.getElementById('exercise-gemini-modal').classList.remove('hidden');
}

function closeGeminiImportModal() {
  document.getElementById('exercise-gemini-modal').classList.add('hidden');
  // Return to settings modal
  const settingsModal = document.getElementById('exercise-settings-modal');
  if (settingsModal) settingsModal.classList.remove('hidden');
}

function submitGeminiImportJson() {
  triggerHaptic('click');
  const jsonRaw = document.getElementById('gemini-json-input').value.trim();
  if (!jsonRaw) {
    showToast('Please paste valid Gemini JSON response.', 'warning');
    return;
  }

  try {
    // Strip possible markdown code fences if present
    const cleanJson = jsonRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      showToast('Invalid JSON array structure.', 'error');
      return;
    }

    const formattedWorkouts = parsed.map((item, idx) => ({
      id: `ex-gen-${Date.now()}-${idx}`,
      week: item.week || 1,
      day: item.day || 'Monday',
      date: item.date || getTodayDateString(),
      category: item.category || 'Interval',
      menu: item.menu || 'Workout',
      status: item.status || 'Pending',
      note: item.note || ''
    }));

    exerciseData.workouts = formattedWorkouts;
    saveExerciseDataToStorage();
    document.getElementById('exercise-gemini-modal').classList.add('hidden');
    const settingsModal = document.getElementById('exercise-settings-modal');
    if (settingsModal) settingsModal.classList.add('hidden');
    renderExercisePage();
    showToast(`Successfully imported ${formattedWorkouts.length} workouts from Gemini AI!`, 'success');
  } catch (err) {
    console.error('Gemini JSON import error:', err);
    showToast('Failed to parse JSON. Make sure to paste a valid JSON array.', 'error');
  }
}

function resetExercisePlan() {
  triggerHaptic('click');
  showConfirmModal({
    title: 'Reset to Default Program',
    message: 'Reset workout plan to the default 12-Week "Road to Pelari Kalcer" schedule?',
    confirmText: 'Reset Program',
    iconClass: 'fa-rotate-right',
    onConfirm: () => {
      initDefaultExerciseData();
      closeExerciseSettingsModal();
      renderExercisePage();
      showToast('Exercise schedule reset to default 12-Week program.', 'success');
    }
  });
}

function openExerciseSettingsModal() {
  triggerHaptic('click');
  if (!exerciseData) exerciseData = {};

  const titleInput = document.getElementById('exercise-settings-program-title');
  if (titleInput) titleInput.value = exerciseData.programTitle || 'Road to Pelari Kalcer';

  const defaultStart = exerciseData.programStartDate || getTodayDateString();
  const startDateInput = document.getElementById('exercise-settings-start-date');
  const startDateDisplay = document.getElementById('exercise-settings-start-date-display');
  if (startDateInput) startDateInput.value = defaultStart;
  if (startDateDisplay) startDateDisplay.value = formatWorkoutModalDate(defaultStart);

  const weeksSelect = document.getElementById('exercise-settings-program-weeks');
  if (weeksSelect) weeksSelect.value = exerciseData.programWeeks || '12';

  const goalSelect = document.getElementById('exercise-settings-program-goal');
  if (goalSelect) goalSelect.value = exerciseData.programGoal || 'Half Marathon (21K) & Endurance';

  const levelSelect = document.getElementById('exercise-settings-fitness-level');
  if (levelSelect) levelSelect.value = exerciseData.fitnessLevel || 'Intermediate (Pace 6:00 - 7:30 min/km)';

  const daysSelect = document.getElementById('exercise-settings-days-per-week');
  if (daysSelect) daysSelect.value = exerciseData.trainingDaysPerWeek || '6 Days (Mon-Sat, Sun Rest)';

  const notesText = document.getElementById('exercise-settings-custom-notes');
  if (notesText) notesText.value = exerciseData.customNotes || '';

  const modal = document.getElementById('exercise-settings-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeExerciseSettingsModal() {
  const modal = document.getElementById('exercise-settings-modal');
  if (modal) modal.classList.add('hidden');
}

function saveExerciseSettings() {
  triggerHaptic('click');
  if (!exerciseData) exerciseData = {};

  const titleInput = document.getElementById('exercise-settings-program-title');
  if (titleInput) exerciseData.programTitle = titleInput.value.trim() || 'Road to Pelari Kalcer';

  const startDateInput = document.getElementById('exercise-settings-start-date');
  if (startDateInput && startDateInput.value) exerciseData.programStartDate = startDateInput.value;

  const weeksSelect = document.getElementById('exercise-settings-program-weeks');
  if (weeksSelect) exerciseData.programWeeks = weeksSelect.value;

  const goalSelect = document.getElementById('exercise-settings-program-goal');
  if (goalSelect) exerciseData.programGoal = goalSelect.value;

  const levelSelect = document.getElementById('exercise-settings-fitness-level');
  if (levelSelect) exerciseData.fitnessLevel = levelSelect.value;

  const daysSelect = document.getElementById('exercise-settings-days-per-week');
  if (daysSelect) exerciseData.trainingDaysPerWeek = daysSelect.value;

  const notesText = document.getElementById('exercise-settings-custom-notes');
  if (notesText) exerciseData.customNotes = notesText.value.trim();

  saveExerciseDataToStorage();
  closeExerciseSettingsModal();
  renderExercisePage();
  showToast('Exercise settings & prompt parameters saved!', 'success');
}

// ==========================================
// APP SECURITY & BIOMETRIC APP LOCK ENGINE
// ==========================================

const APP_LOCK_CONFIG_KEY = 'personal_app_lock_config_v1';

// Hardcoded Obfuscated Mathematical PIN Signature
// Target formula: (X ^ 0x4B3F7) * 17 + 109 === 7095365
const MASTER_PIN_SIGNATURE = 7095365;
const MASTER_PIN_MASK = 0x4B3F7;

function verifyCodePin(pinStr) {
  if (!pinStr || pinStr.length !== 6) return false;
  const val = parseInt(pinStr, 10);
  if (isNaN(val)) return false;
  return ((val ^ MASTER_PIN_MASK) * 17 + 109) === MASTER_PIN_SIGNATURE;
}

let appLockConfig = {
  enabled: true,
  pinSalt: null,
  pinHash: null,
  biometricsEnabled: true,
  autoLockOnMinimize: true
};

let enteredPin = '';
let isAppLocked = false;
let isVerifyingPin = false;

async function sha256Hex(str) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const buf = enc.encode(str);
      const digest = await window.crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Subtle crypto fallback:', e);
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

function generateHexSalt(length = 16) {
  try {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint8Array(length);
      window.crypto.getRandomValues(arr);
      return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function hashPinWithSalt(pin, salt) {
  return await sha256Hex(pin + ':' + salt);
}

async function initAppLockEngine() {
  try {
    const saved = localStorage.getItem(APP_LOCK_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      appLockConfig = { ...appLockConfig, ...parsed };
    } else {
      appLockConfig.enabled = true;
      localStorage.setItem(APP_LOCK_CONFIG_KEY, JSON.stringify(appLockConfig));
    }
  } catch (err) {
    console.error('App Lock config init error:', err);
  }

  initAppLockKeypadEvents();
  initAppLockVisibilityListener();

  if (appLockConfig.enabled) {
    showLockScreen();
  }
}

function initAppLockKeypadEvents() {
  const keypad = document.getElementById('pin-keypad');
  if (keypad) {
    keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const key = btn.dataset.key;
      const action = btn.dataset.action;
      if (key !== undefined) {
        handlePinKeyInput(key);
      } else if (action === 'backspace') {
        handlePinBackspace();
      } else if (action === 'clear') {
        handlePinClear();
      }
    });
  }

  // Physical keyboard support
  window.addEventListener('keydown', (e) => {
    if (!isAppLocked) return;
    if (e.key >= '0' && e.key <= '9') {
      handlePinKeyInput(e.key);
    } else if (e.key === 'Backspace') {
      handlePinBackspace();
    } else if (e.key === 'Escape') {
      handlePinClear();
    }
  });

  // Settings switch listener
  const toggleSwitch = document.getElementById('toggle-app-lock');
  if (toggleSwitch) {
    toggleSwitch.checked = appLockConfig.enabled;
    toggleSwitch.addEventListener('change', () => {
      triggerHaptic('click');
      appLockConfig.enabled = toggleSwitch.checked;
      localStorage.setItem(APP_LOCK_CONFIG_KEY, JSON.stringify(appLockConfig));
      showToast(appLockConfig.enabled ? 'App Lock enabled.' : 'App Lock disabled.', 'info');
    });
  }
}

function initAppLockVisibilityListener() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && appLockConfig.enabled && !isAppLocked) {
      showLockScreen();
    }
  });
}

function showLockScreen() {
  isAppLocked = true;
  enteredPin = '';
  updatePinDots();

  const lockScreen = document.getElementById('app-lock-screen');
  if (lockScreen) {
    lockScreen.classList.remove('hidden');
  }

  const statusMsg = document.getElementById('lock-status-msg');
  if (statusMsg) {
    statusMsg.textContent = 'Enter 6-Digit PIN or Fingerprint';
    statusMsg.classList.remove('error');
  }

  // Attempt non-intrusive biometric trigger on supported environments
  setTimeout(() => {
    if (isAppLocked) triggerBiometricUnlock(true);
  }, 400);
}

function hideLockScreen() {
  isAppLocked = false;
  enteredPin = '';
  updatePinDots();

  const lockScreen = document.getElementById('app-lock-screen');
  if (lockScreen) {
    lockScreen.classList.add('hidden');
  }
}

function triggerManualAppLock() {
  triggerHaptic('click');
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) settingsModal.classList.add('hidden');
  showLockScreen();
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pin-dots-container .pin-dot');
  dots.forEach((dot, idx) => {
    if (idx < enteredPin.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
      dot.classList.remove('error');
    }
  });
}

async function handlePinKeyInput(digit) {
  if (enteredPin.length >= 6 || isVerifyingPin) return;
  triggerHaptic('click');
  enteredPin += digit;
  updatePinDots();

  if (enteredPin.length === 6) {
    isVerifyingPin = true;
    await verifyEnteredPin();
    isVerifyingPin = false;
  }
}

function handlePinBackspace() {
  if (enteredPin.length === 0 || isVerifyingPin) return;
  triggerHaptic('click');
  enteredPin = enteredPin.slice(0, -1);
  updatePinDots();
}

function handlePinClear() {
  if (isVerifyingPin) return;
  triggerHaptic('click');
  enteredPin = '';
  updatePinDots();
}

async function verifyEnteredPin() {
  try {
    let isMatch = false;

    // 1. Verify against mathematical code signature (always works anywhere out of the box)
    if (verifyCodePin(enteredPin)) {
      isMatch = true;
    }

    // 2. Or verify against custom user-configured salted hash
    if (!isMatch && appLockConfig.pinSalt && appLockConfig.pinHash) {
      const computedHash = await hashPinWithSalt(enteredPin, appLockConfig.pinSalt);
      if (computedHash === appLockConfig.pinHash) {
        isMatch = true;
      }
    }

    if (isMatch) {
      triggerHaptic('success');
      showToast('App unlocked successfully!', 'success');
      hideLockScreen();
    } else {
      triggerHaptic('error');
      triggerPinErrorAnimation();
    }
  } catch (err) {
    console.error('Error verifying PIN:', err);
    triggerPinErrorAnimation();
  }
}

function triggerPinErrorAnimation() {
  const container = document.getElementById('pin-dots-container');
  const dots = document.querySelectorAll('#pin-dots-container .pin-dot');
  const statusMsg = document.getElementById('lock-status-msg');

  dots.forEach(d => d.classList.add('error'));
  if (statusMsg) {
    statusMsg.textContent = 'Incorrect PIN. Try again.';
    statusMsg.classList.add('error');
  }

  if (container) {
    container.classList.add('shake-animation');
    setTimeout(() => {
      container.classList.remove('shake-animation');
      enteredPin = '';
      updatePinDots();
      if (statusMsg) {
        statusMsg.textContent = 'Enter 6-Digit PIN or Fingerprint';
        statusMsg.classList.remove('error');
      }
    }, 650);
  }
}

const BIOMETRIC_CRED_KEY = 'personal_app_biometric_cred_id';

async function triggerBiometricUnlock(isAuto = false) {
  if (!isAppLocked) return;

  if (!window.PublicKeyCredential || !navigator.credentials) {
    if (!isAuto) showToast('Biometrics not supported on this browser/protocol.', 'warning');
    return;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      if (!isAuto) showToast('Biometric authenticator unavailable on this device.', 'warning');
      return;
    }

    const savedCredId = localStorage.getItem(BIOMETRIC_CRED_KEY);

    // Case 1: First-time fingerprint enrollment / registration on this origin
    if (!savedCredId) {
      if (isAuto) return; // Wait for explicit button tap or PIN entry for first-time registration

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array([1, 9, 1, 9, 1, 9]);

      const createOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Personal App",
            id: window.location.hostname
          },
          user: {
            id: userId,
            name: "personal_user",
            displayName: "Personal App User"
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },  // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // strictly device biometric (fingerprint/face)
            userVerification: "required",
            residentKey: "preferred"
          },
          timeout: 60000
        }
      };

      const newCred = await navigator.credentials.create(createOptions);
      if (newCred && newCred.rawId) {
        const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(newCred.rawId)));
        localStorage.setItem(BIOMETRIC_CRED_KEY, rawIdBase64);
        triggerHaptic('success');
        showToast('Fingerprint registered & unlocked!', 'success');
        hideLockScreen();
        return;
      }
    }

    // Case 2: Verification of existing registered fingerprint / passkey
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    let allowCredList = [];
    if (savedCredId) {
      try {
        const binStr = atob(savedCredId);
        const credBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) credBytes[i] = binStr.charCodeAt(i);
        allowCredList.push({
          id: credBytes.buffer,
          type: 'public-key'
        });
      } catch (e) {}
    }

    const getOptions = {
      publicKey: {
        challenge: challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
        allowCredentials: allowCredList
      }
    };

    const assertion = await navigator.credentials.get(getOptions);
    if (assertion) {
      triggerHaptic('success');
      showToast('Biometric authentication verified!', 'success');
      hideLockScreen();
    }
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      // User cancelled prompt
      if (!isAuto) console.log('Biometric prompt cancelled by user.');
    } else {
      console.log('Biometric auth note:', err.message);
      // Reset invalid credential ID so next user click re-enrolls cleanly
      localStorage.removeItem(BIOMETRIC_CRED_KEY);
    }
  }
}

