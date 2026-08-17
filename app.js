/**
 * Personal Habit Tracker & Daily Task Scheduler - Core PWA Logic
 * Wireframe Layout Engine
 */

const STATE_KEY_TASKS = 'pts_tasks_v1';
const STATE_KEY_GAS_URL = 'pts_gas_url_v1';
const STATE_KEY_IBADAH = 'pts_ibadah_v1';
const LOCKED_GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz-STcvV8kMGP04ZLuNcX3W3QuSU5q2XJnA9ScSquq8vgBBtcMjlhUw3IFM8LWl5sw/exec';

let tasks = [];
let ibadahData = {};
let currentSelectedDate = getTodayDateString();
let currentIbadahDate = getTodayDateString();
let gasWebAppUrl = LOCKED_GAS_WEB_APP_URL;
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
  initTabNavigation();
  initIbadahEngine();
  initFabCloudMenu();
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

  gasWebAppUrl = LOCKED_GAS_WEB_APP_URL;
  localStorage.setItem(STATE_KEY_GAS_URL, LOCKED_GAS_WEB_APP_URL);
  const gasInput = document.getElementById('gas-url-input');
  if (gasInput) {
    gasInput.value = LOCKED_GAS_WEB_APP_URL;
    gasInput.readOnly = true;
  }
}

function saveTasksToStorage() {
  localStorage.setItem(STATE_KEY_TASKS, JSON.stringify(tasks));
}

function saveIbadahDataToStorage() {
  localStorage.setItem(STATE_KEY_IBADAH, JSON.stringify(ibadahData));
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
  const dateText = formatFullHumanDate(getTodayDateString());

  const clockEl = document.getElementById('live-clock');
  const dateEl = document.getElementById('live-date');
  if (clockEl) clockEl.innerHTML = timeHtml;
  if (dateEl) dateEl.textContent = dateText;

  const ibadahClockEl = document.getElementById('ibadah-live-clock');
  const ibadahDateEl = document.getElementById('ibadah-live-date');
  if (ibadahClockEl) ibadahClockEl.innerHTML = timeHtml;
  if (ibadahDateEl) ibadahDateEl.textContent = dateText;
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
  document.querySelectorAll('.task-table-row').forEach(row => {
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

  showToast('Uploading Tasks & Worship data to Google Sheets...', 'info');

  try {
    const payload = {
      action: 'upload_all',
      tasks: tasks,
      ibadah: ibadahData,
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
      showToast('Upload successful! Tasks & Worship data saved.', 'success');
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

  showToast('Fetching Tasks & Worship data from Google Sheets...', 'info');

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

      renderApp();
      showToast(`Download successful! ${taskCount} tasks & ${ibadahDaysCount} worship days loaded.`, 'success');
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
    message: 'Are you sure you want to clear all local tasks and worship data?',
    confirmText: 'Reset',
    iconClass: 'fa-rotate-right',
    onConfirm: () => {
      localStorage.removeItem(STATE_KEY_TASKS);
      localStorage.removeItem(STATE_KEY_IBADAH);
      tasks = [];
      ibadahData = {};
      saveTasksToStorage();
      saveIbadahDataToStorage();
      initStorage();
      renderApp();
      document.getElementById('settings-modal').classList.add('hidden');
      showToast('All local task and worship cache cleared successfully.', 'info');
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

      triggerHaptic('click');
      clearPrayerFocusEffect();

      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

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
      }
    });
  });
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

function updateFloatingSummaryButtonState() {
  const floatBtn = document.getElementById('ibadah-floating-summary-btn');
  if (!floatBtn) return;

  const activeTab = document.querySelector('.pill-nav-item.active');
  const isIbadahViewVisible = document.getElementById('view-ibadah') && !document.getElementById('view-ibadah').classList.contains('hidden');

  if (isIbadahViewVisible && window.scrollY <= 25) {
    floatBtn.classList.remove('hidden-float');
  } else {
    floatBtn.classList.add('hidden-float');
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
