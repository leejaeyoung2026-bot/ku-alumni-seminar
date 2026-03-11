/**
 * Google Apps Script — KU Alumni Seminar Registration API
 *
 * 사용법:
 * 1. Google Sheets에서 확장 프로그램 > Apps Script 클릭
 * 2. 이 코드를 Code.gs에 붙여넣기
 * 3. 배포 > 새 배포 > 웹 앱 선택
 *    - 실행 권한: 본인 계정
 *    - 액세스 권한: 모든 사용자
 * 4. 배포 URL을 js/app.js의 API_URL에 입력
 *
 * JSONP 방식으로 CORS 문제를 완전히 우회합니다.
 * callback 파라미터가 있으면 JSONP, 없으면 JSON 응답.
 */

const SHEET_NAME = 'Sheet1';

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function ensureHeaders() {
  const sheet = getSheet();
  const headers = sheet.getRange(1, 1, 1, 7).getValues()[0];
  if (!headers[0]) {
    sheet.getRange(1, 1, 1, 7).setValues([
      ['이름', '연락처', '기수', '소속', '저녁식사', '등록일시', '수정일시']
    ]);
  }
}

function doGet(e) {
  ensureHeaders();
  const p = e.parameter;
  const action = p.action || 'lookup';
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  var result;

  if (action === 'lookup') {
    result = { found: false };
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === p.phone) {
        result = {
          found: true,
          name: data[i][0],
          phone: data[i][1],
          generation: String(data[i][2]),
          affiliation: data[i][3],
          dinner: data[i][4],
        };
        break;
      }
    }
  } else if (action === 'register') {
    result = { success: true };
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === p.phone) {
        result = { success: false, duplicate: true };
        break;
      }
    }
    if (result.success) {
      sheet.appendRow([p.name, p.phone, p.generation, p.affiliation, p.dinner, now, '']);
    }
  } else if (action === 'update') {
    result = { success: false, message: 'not found' };
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === p.phone) {
        var row = i + 1;
        sheet.getRange(row, 1, 1, 7).setValues([[
          p.name, p.phone, p.generation, p.affiliation, p.dinner, data[i][5], now
        ]]);
        result = { success: true };
        break;
      }
    }
  } else {
    result = { success: false, message: 'invalid action' };
  }

  // JSONP 지원
  if (p.callback) {
    return ContentService
      .createTextOutput(p.callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
