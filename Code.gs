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

function doGet(e) {
  try {
    const action = e.parameter.action || 'get_tasks';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME_DAILY_TASKS);

    if (!sheet) {
      sheet = initDailyTasksSheet(ss);
    }

    if (action === 'get_tasks' || action === 'get_all') {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const tasks = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue; // Skip empty rows

        tasks.push({
          id: String(row[0]),
          date: formatDateValue(row[1]),
          name: String(row[2]),
          category: String(row[3]),
          startTime: String(row[4]),
          endTime: String(row[5]),
          status: String(row[6]),
          notes: String(row[7] || '')
        });
      }

      return createJsonResponse({
        status: 'success',
        tasks: tasks,
        count: tasks.length
      });
    }

    return createJsonResponse({ status: 'error', message: 'Invalid action parameter' });

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action || 'upload_all';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME_DAILY_TASKS);

    if (!sheet) {
      sheet = initDailyTasksSheet(ss);
    }

    if (action === 'upload_all' || action === 'sync_tasks') {
      const tasks = postData.tasks || [];

      // Clear existing data rows (keep header)
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
      }

      if (tasks.length > 0) {
        const rows = tasks.map(t => [
          t.id,
          t.date,
          t.name,
          t.category,
          t.startTime,
          t.endTime,
          t.status,
          t.notes || '',
          new Date().toISOString()
        ]);

        sheet.getRange(2, 1, rows.length, 9).setValues(rows);
      }

      return createJsonResponse({
        status: 'success',
        message: `Successfully synchronized ${tasks.length} tasks to Google Sheets`,
        timestamp: new Date().toISOString()
      });
    }

    return createJsonResponse({ status: 'error', message: 'Unknown post action' });

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// Helper: Initialize Sheet Tab & Headers
function initDailyTasksSheet(ss) {
  const sheet = ss.insertSheet(SHEET_NAME_DAILY_TASKS);
  const headers = ['ID', 'Date', 'Task Name', 'Category', 'Start Time', 'End Time', 'Status', 'Notes', 'Updated At'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  return sheet;
}

// Helper: Format Date from Sheet
function formatDateValue(val) {
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val);
}

// Helper: Create JSON HTTP Response
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
