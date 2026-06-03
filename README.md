# 🌿 샘터 조직 관리 시스템 — 설치 가이드

## 파일 구성
```
samter-system/
├── Code.gs       ← Google Apps Script (백엔드)
├── index.html    ← 메인 페이지
├── style.css     ← 스타일시트
├── app.js        ← 프론트엔드 로직
└── README.md
```

---

## STEP 1 — Google Sheets 설정

1. [Google Sheets](https://sheets.google.com) 에서 기존 샘터 조직표 파일 열기
2. 주소창에서 Sheets ID 복사  
   `https://docs.google.com/spreadsheets/d/【여기가 ID】/edit`
3. 시트 이름 확인 — 아래와 정확히 일치해야 합니다:
   - `조직표` (기존: `2025 샘터` → 이름 변경 필요)
   - `비활동교인`
   - `방배정`
   - `변경이력` ← 없으면 자동 생성됨
   - `세션` ← 없으면 자동 생성됨

> ⚠️ **`2025 샘터` 시트 이름을 `조직표`로 반드시 변경하세요**

---

## STEP 2 — Apps Script 설정

1. Sheets 상단 메뉴 → **확장 프로그램 → Apps Script**
2. 기존 코드 전체 삭제 후 **Code.gs** 전체 붙여넣기
3. 상단 2줄 수정:
   ```js
   SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',  // ← STEP 1에서 복사한 ID
   PASSWORD: 'samter2026',             // ← 원하는 비밀번호로 변경
   ```
4. 저장 (Ctrl+S)

---

## STEP 3 — Apps Script 웹앱 배포

1. Apps Script 우측 상단 **배포 → 새 배포**
2. 유형: **웹 앱**
3. 설정:
   - 설명: `샘터 조직 관리 v1`
   - 실행 계정: **나**
   - 액세스 권한: **모든 사용자** (익명 포함)
4. **배포** 클릭 → 권한 승인
5. 발급된 웹앱 URL 복사  
   `https://script.google.com/macros/s/【DEPLOY_ID】/exec`

---

## STEP 4 — GitHub Pages 배포

1. GitHub에서 새 저장소 생성 (예: `samter-2026`)
2. 4개 파일 업로드: `index.html`, `style.css`, `app.js`, `README.md`
3. **Settings → Pages → Source: main branch / (root)**
4. 사이트 URL 확인: `https://【username】.github.io/samter-2026`

### app.js 수정 (필수)
```js
// app.js 첫 줄
const API_URL = 'https://script.google.com/macros/s/【DEPLOY_ID】/exec';
//                                                     ↑ STEP 3에서 복사
```

---

## STEP 5 — 접속 및 사용

1. GitHub Pages URL 접속
2. 비밀번호 입력 (STEP 2에서 설정한 값)
3. 로그인 완료!

---

## 주요 기능

| 탭 | 기능 |
|----|------|
| 📋 조직표 | 조원 추가/수정/삭제, 청지기 변경, 지구 필터, 이름 검색 |
| 🏠 방배정 | 샘터별 첫째주/둘째주 방 입력 및 저장 |
| 📌 비활동 | 비활동 교인 추가/삭제, 환우/장결자/타주 분류 |
| 📜 변경이력 | 모든 수정 내역 자동 기록, 최신 150건 조회 |
| ⬇ 내보내기 | 4개 시트(조직표/방배정/비활동/이력) 엑셀 다운로드 |

---

## 자주 묻는 질문

**Q. "세션 만료" 메시지가 뜨면?**  
→ 8시간 후 자동 만료됩니다. 다시 로그인하세요.

**Q. 수정했는데 시트에 반영이 안 돼요?**  
→ Apps Script 재배포 필요: 배포 → 기존 배포 관리 → 새 버전으로 업데이트

**Q. 모바일에서도 쓸 수 있나요?**  
→ 네, 하단 탭 네비게이션으로 최적화되어 있습니다.
