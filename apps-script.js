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
 * 중요: POST는 CORS 문제가 있으므로 모든 요청을 GET으로 처리합니다.
 * - 조회: ?action=lookup&phone=010-xxxx-xxxx
 * - 등록: ?action=register&name=...&phone=...&generation=...&affiliation=...&dinner=...
 * - 수정: ?action=update&name=...&phone=...&generation=...&affiliation=...&dinner=...
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

  // 조회
  if (action === 'lookup') {
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === p.phone) {
        return jsonResponse({
          found: true,
          name: data[i][0],
          phone: data[i][1],
          generation: String(data[i][2]),
          affiliation: data[i][3],
          dinner: data[i][4],
        });
      }
    }
    return jsonResponse({ found: false });
  }

  // 등록
  if (action === 'register') {
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === p.phone) {
        return jsonResponse({ success: false, duplicate: true });
      }
    }
    sheet.appendRow([
      p.name,
      p.phone,
      p.generation,
      p.affiliation,
      p.dinner,
      now,
      ''
    ]);
    return jsonResponse({ success: true });
  }

  // 수정
  if (action === 'update') {
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === p.phone) {
        const row = i + 1;
        sheet.getRange(row, 1, 1, 7).setValues([[
          p.name,
          p.phone,
          p.generation,
          p.affiliation,
          p.dinner,
          data[i][5],
          now
        ]]);
        return jsonResponse({ success: true });
      }
    }
    return jsonResponse({ success: false, message: 'not found' });
  }

  return jsonResponse({ success: false, message: 'invalid action' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
