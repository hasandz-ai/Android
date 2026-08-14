/**
 * Google Apps Script Web App Backend for Personal Habit Tracker & Task Scheduler
 * Deploy Instructions:
 * 1. Open Google Sheet -> Extensions -> Apps Script
 * 2. Paste this Code.gs script
 * 3. Click "Deploy" -> "New deployment" -> Select "Web app"
 * 4. Execute as: "Me"
 * 5. Who has access: "Anyone"
 * 6. Copy Web App URL into PWA Settings
 */

const SHEET_NAME_DAILY_TASKS = 'DailyTasks';
const SHEET_NAME_WORSHIP = 'WorshipTracker';

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Read Tasks Sheet Data
    let taskSheet = ss.getSheetByName(SHEET_NAME_DAILY_TASKS);
    if (!taskSheet) taskSheet = initDailyTasksSheet(ss);

    const taskData = taskSheet.getDataRange().getValues();
    const tasks = [];
    for (let i = 1; i < taskData.length; i++) {
      const row = taskData[i];
      if (!row[0]) continue; // Skip empty rows

      tasks.push({
        id: String(row[0]),
        date: formatDateValue(row[1]),
        name: String(row[2]),
        category: String(row[3]),
        startTime: formatTimeValue(row[4]),
        endTime: formatTimeValue(row[5]),
        status: String(row[6]),
        notes: String(row[7] || '')
      });
    }

    // 2. Read Worship Sheet Data
    let worshipSheet = ss.getSheetByName(SHEET_NAME_WORSHIP);
    if (!worshipSheet) worshipSheet = initWorshipSheet(ss);

    const worshipData = worshipSheet.getDataRange().getValues();
    const ibadahObj = {};
    for (let i = 1; i < worshipData.length; i++) {
      const row = worshipData[i];
      if (!row[0]) continue; // Skip empty rows

      const dateStr = formatDateValue(row[0]);
      const prayers = {
        tahajud: String(row[1] || "Not Prayed"),
        fajr: String(row[2] || "Not Prayed"),
        dhuha: String(row[3] || "Not Prayed"),
        dhuhr: String(row[4] || "Not Prayed"),
        asr: String(row[5] || "Not Prayed"),
        maghrib: String(row[6] || "Not Prayed"),
        isya: String(row[7] || "Not Prayed"),
        taubat: String(row[8] || "Not Prayed"),
        hajat: String(row[9] || "Not Prayed")
      };
      const quranDuration = Number(row[10]) || 0;

      ibadahObj[dateStr] = {
        prayers: prayers,
        quranDuration: quranDuration
      };
    }

    return createJsonResponse({
      status: 'success',
      tasks: tasks,
      ibadah: ibadahObj,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Sync Tasks to 'DailyTasks' Sheet
    let taskSheet = ss.getSheetByName(SHEET_NAME_DAILY_TASKS);
    if (!taskSheet) taskSheet = initDailyTasksSheet(ss);

    const tasks = postData.tasks || [];
    const lastTaskRow = taskSheet.getLastRow();
    if (lastTaskRow > 1) {
      taskSheet.getRange(2, 1, lastTaskRow - 1, 9).clearContent();
    }

    if (tasks.length > 0) {
      const taskRows = tasks.map(t => [
        t.id,
        "'" + formatDateValue(t.date),
        t.name,
        t.category,
        "'" + formatTimeValue(t.startTime),
        "'" + formatTimeValue(t.endTime),
        t.status,
        t.notes || '',
        new Date().toISOString()
      ]);
      taskSheet.getRange(2, 1, taskRows.length, 9).setValues(taskRows);
    }

    // 2. Sync Worship to 'WorshipTracker' Sheet
    let worshipSheet = ss.getSheetByName(SHEET_NAME_WORSHIP);
    if (!worshipSheet) worshipSheet = initWorshipSheet(ss);

    const ibadahObj = postData.ibadah || {};
    const dateKeys = Object.keys(ibadahObj);
    const lastWorshipRow = worshipSheet.getLastRow();
    if (lastWorshipRow > 1) {
      worshipSheet.getRange(2, 1, lastWorshipRow - 1, 12).clearContent();
    }

    if (dateKeys.length > 0) {
      const worshipRows = dateKeys.map(dStr => {
        const item = ibadahObj[dStr] || {};
        const p = item.prayers || {};
        return [
          "'" + formatDateValue(dStr),
          p.tahajud || "Not Prayed",
          p.fajr || "Not Prayed",
          p.dhuha || "Not Prayed",
          p.dhuhr || "Not Prayed",
          p.asr || "Not Prayed",
          p.maghrib || "Not Prayed",
          p.isya || "Not Prayed",
          p.taubat || "Not Prayed",
          p.hajat || "Not Prayed",
          Number(item.quranDuration) || 0,
          new Date().toISOString()
        ];
      });
      worshipSheet.getRange(2, 1, worshipRows.length, 12).setValues(worshipRows);
    }

    return createJsonResponse({
      status: 'success',
      message: `Successfully synchronized ${tasks.length} tasks and ${dateKeys.length} worship records to Google Sheets`,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// Helper: Initialize Daily Tasks Sheet Tab
function initDailyTasksSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_DAILY_TASKS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_DAILY_TASKS);
  }
  const headers = ['ID', 'Date', 'Task Name', 'Category', 'Start Time', 'End Time', 'Status', 'Notes', 'Updated At'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0284c7').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  return sheet;
}

// Helper: Initialize Worship Tracker Sheet Tab
function initWorshipSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_WORSHIP);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_WORSHIP);
  }
  const headers = ['Date', 'Tahajud', 'Fajr', 'Dhuha', 'Dhuhr', 'Asr', 'Maghrib', 'Isya', 'Taubat', 'Hajat', 'Quran Mins', 'Updated At'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fb8b24').setFontColor('#000000');
  sheet.setFrozenRows(1);
  return sheet;
}

// Helper: Format Time strictly as HH:mm
function formatTimeValue(val) {
  if (!val) return '08:00';

  if (val instanceof Date) {
    const hh = String(val.getHours()).padStart(2, '0');
    const mm = String(val.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  const str = String(val).trim();

  // If already HH:mm or H:mm
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const parts = str.split(':');
    return `${String(parts[0]).padStart(2, '0')}:${parts[1]}`;
  }

  // If long Date string e.g. "Sat Dec 30 1899 08:00:00 GMT..."
  const timeMatch = str.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
  }

  return '08:00';
}

// Helper: Format Date strictly as YYYY-MM-DD
function formatDateValue(val) {
  if (!val) return '';

  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(val).trim();
  const dateMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return dateMatch[0];
  }

  return str;
}

// Helper: Create JSON HTTP Response
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
