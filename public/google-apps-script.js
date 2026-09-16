function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Typ', 'E-mail / Výhra', 'Skóre / ID Výhry', 'Čas záznamu', 'Tablet / Stanoviště']);
      sheet.getRange('A1:F1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    if (data.type === 'spin') {
      sheet.appendRow([
        data.id,
        'Roztočení',
        data.prizeName,
        data.prizeId,
        data.timestamp,
        data.station || 'Neznámý'
      ]);
    } else if (data.type === 'entry') {
      sheet.appendRow([
        data.id,
        'Soutěžící',
        data.email,
        data.score,
        data.timestamp,
        data.station || 'Neznámý'
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle preflight requests for CORS
function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}
