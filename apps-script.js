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
 */

const SHEET_NAME = 'Sheet1';

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

// 헤더 자동 생성
function ensureHeaders() {
  const sheet = getSheet();
  const headers = sheet.getRange(1, 1, 1, 7).getValues()[0];
  if (!headers[0]) {
    sheet.getRange(1, 1, 1, 7).setValues([
      ['이름', '연락처', '기수', '소속', '저녁식사', '등록일시', '수정일시']
    ]);
  }
}

// GET: 전화번호로 조회
function doGet(e) {
  ensureHeaders();
  const phone = e.parameter.phone;
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === phone) {
      return jsonResponse({
        found: true,
        name: data[i][0],
        phone: data[i][1],
        generation: data[i][2],
        affiliation: data[i][3],
        dinner: data[i][4],
      });
    }
  }

  return jsonResponse({ found: false });
}

// POST: 등록 또는 수정
function doPost(e) {
  ensureHeaders();
  const body = JSON.parse(e.postData.contents);
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  if (body.action === 'register') {
    // 중복 체크
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === body.phone) {
        return jsonResponse({ success: false, duplicate: true });
      }
    }
    // 새 행 추가
    sheet.appendRow([
      body.name,
      body.phone,
      body.generation,
      body.affiliation,
      body.dinner,
      now,
      ''
    ]);
    return jsonResponse({ success: true });
  }

  if (body.action === 'update') {
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === body.phone) {
        const row = i + 1;
        sheet.getRange(row, 1, 1, 7).setValues([[
          body.name,
          body.phone,
          body.generation,
          body.affiliation,
          body.dinner,
          data[i][5], // 원래 등록일시 유지
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
