# KU Alumni Seminar — 설정 가이드

## 1. Google Sheets 설정

1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. 시트 이름이 `Sheet1`인지 확인 (기본값)

## 2. Apps Script 배포

1. 스프레드시트 상단 메뉴: **확장 프로그램 > Apps Script**
2. `Code.gs` 파일에 `apps-script.js` 내용을 복사-붙여넣기
3. 저장 (Ctrl+S)
4. **배포 > 새 배포** 클릭
5. 유형: **웹 앱** 선택
6. 설정:
   - 설명: `KU Seminar API`
   - 실행 권한: **본인 계정**
   - 액세스 권한: **모든 사용자**
7. **배포** 클릭 → URL 복사

## 3. 프론트엔드 연결

`js/app.js` 파일 상단의 `API_URL`에 복사한 URL 입력:

```js
const API_URL = 'https://script.google.com/macros/s/xxxx/exec';
```

## 4. Cloudflare Pages 배포

```bash
# 방법 1: Git 연동
# GitHub repo를 Cloudflare Pages에 연결하면 자동 배포

# 방법 2: Direct Upload
npx wrangler pages deploy . --project-name=ku-seminar
```

## 5. 파일 구조

```
ku-seminar/
├── index.html          # 랜딩페이지
├── css/style.css       # 스타일
├── js/app.js           # 프론트엔드 로직
├── apps-script.js      # Google Apps Script (시트에 복사)
└── SETUP.md            # 이 파일
```
