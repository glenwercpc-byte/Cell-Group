// ================================================================
//  시카고 언약 장로교회 샘터 조직표 — app.js (최종 Google Sheets 연동)
//
//  저장소: Google Sheets (Apps Script) + localStorage (오프라인 백업)
//  기능:
//    - 연도별 조직표 관리
//    - 10번째 칸 Enter → 자동 줄 추가
//    - 청지기 포함 인원수 표시
//    - 저장 비밀번호(4241) 확인
//    - 월 샘터보고서 입력 + Google Sheets 저장
//    - 년중 출석 상황 (12개월 기준 출석률)
//    - 조직표 출력 (Google Docs 붙여넣기)
// ================================================================

// ★ Apps Script 배포 URL로 교체하세요
const API_URL     = 'https://script.google.com/macros/s/AKfycbyURNDdOrRtjq8MiO7ZcXzD_tagxH18Jad9l7asR2oSimGIf4Ak1SL0ImE5EmEkN-OR/exec';
const ORG_KEY     = 'samter_org_final';
const ATT_KEY     = 'samter_attendance';
const SAVE_PASSWORD = '4241';

// ── 전역 상태 ────────────────────────────────────────────────────
let SESSION_TOKEN = null;   // Google Sheets 세션 토큰
let allData     = {};   // { '2026': [ {name, samters:[]} ] }
let currentYear = '2026';
let state       = [];   // 현재 연도 작업 districts
let attData     = {};   // { '2026': { '22': { '1': { name: 'O'|'X' } } } }
let nextSid     = 500;
let pendingYear = null;
let selMode     = null;

// ── 2026년 기본 데이터 ──────────────────────────────────────────
const BASE_2026 = [
  {name:'1지구',samters:[
    {num:'11',keeper:'김건우(완상)',members:['김영옥','김영자(명희)','김오화','김정순','박혜자','박영욱(이영일)','박창만(정수)','송혜주','이경자','이보원','이순자','이인옥','이정우(은선)','이Connie','정해일(영숙)','허명희','홍인기(순원)']},
    {num:'12',keeper:'정찬경(순옥)',members:['고승남(영옥)','구태회(석순)','김진구(숙자)','박재선(승숙)','유홍기(윤옥)','이경희(한용)','이금성(봉희)','이기상(영례)','이인기(분양)','이종우(문자)','최봉덕']},
    {num:'13',keeper:'이신민목사(청년)',members:['김성은','김인중','박지원','신정수','신예송','윤율','하경원']},
  ]},
  {name:'2지구',samters:[
    {num:'21',keeper:'임채석(계원)',members:['권도영','김재영(순영)','천용철(도희)','김태원','김희석(연화)','박준환(숙자)','박태수(윤자)','신석균(송자)','황인철(명숙)','정정강']},
    {num:'22',keeper:'윤자명',members:['강혜영','노은님','송정민(선)','심정옥','여선희','이규호(현순)','이진방(숙자)','이춘강','장윤일','채경주','최홍렬(금선)','하재관(영)','황산성','현종환(금수)','김동진(정숙)']},
    {num:'23',keeper:'송정은(심윤문)',members:['강철희(수정)','고유심','김미영','김성민(이의정)','김영식(명심)','김정오(수진)','김Sara','김태봉(정아)','김형률(박신영)','노동기','박정인(주현)','서인호(재경)','설재두','설창욱','윤준용(순희)','최은경','최하늘','하재원(정우)']},
  ]},
  {name:'3지구',samters:[
    {num:'31',keeper:'공길봉(명심)',members:['김문주','김한영(화자)','문준숙','조옥자','백경환(해나)','서성규(선영)','심상호(은영)','심윤조(경화)','윤정호(순임)','이근후(신자)','이병기(혜숙)','이재욱(춘자)']},
    {num:'32',keeper:'김미경',members:['김정한','김복님','김옥경','김춘경','김춘매','김혜경','박애경','서조연','안연숙','윤민자','이두리','이미자','이조문','이혜자','한지영']},
    {num:'33',keeper:'이윤종(남이)',members:['강위기','강성혜','강효숙','김금자','김명진(선희)','김요한(미화)','박양숙','송성례','손영숙','이명자','이완심','임덕근','장춘근','홍영자']},
  ]},
  {name:'4지구',samters:[
    {num:'41',keeper:'홍기성(현자)',members:['김동진(정숙)','김선혜','김우일(영회)','송세훈(정숙)','안경찬(임춘)','엔드류영(베티)','이무영(선희)','장명무(명숙)','최준택(영숙)','한상철(애경)','홍길봉(순인)']},
    {num:'42',keeper:'전복순(성익)',members:['강상수(박그레이스)','권효섭(정희)','김건국(혜숙)','김영숙','김용규(선영)','박순길','서용재(옥주)','서정률(연실)','송영심(명우)','이석기(은령)','정차곤(영애)','채지원','장진술(경자)','주동린']},
    {num:'43',keeper:'황광연(은주)',members:['김귀남(창화)','김미희(홍섭)','김병식(희숙)','김숙인','김승주','김완수(주희)','박용병(현주)','변지웅(군희)','염은경','이샤론','이인석(숙화)','전상우(선희)','정해자','최규일(은영)','최대식(옥현)']},
  ]},
];

// ================================================================
//  초기화
// ================================================================
window.addEventListener('DOMContentLoaded', () => {
  // 로그인 없이 바로 시작 (테스트 모드)
  SESSION_TOKEN = 'test-no-auth';
  showApp();
  initApp();
});

// 앱 초기화 — Sheets 우선, 실패 시 localStorage → BASE_2026
async function initApp() {
  // 1. 일단 localStorage 로드해서 빠르게 화면 표시
  loadLocalData();

  // 2. Sheets에서 최신 데이터 로드 (세션 있을 때만)
  if (SESSION_TOKEN && SESSION_TOKEN !== 'local' &&
      API_URL && !API_URL.includes('YOUR_DEPLOY_ID')) {
    try {
      const orgRes = await apiCall({ action: 'getOrg', year: currentYear });
      if (orgRes && orgRes.districts) {
        const converted = convertSheetsOrg(orgRes.districts);
        if (converted.length > 0 && converted.some(d => d.samters.length > 0)) {
          allData[currentYear] = converted;
          saveLocalOrg();
          loadYear(currentYear);
          console.log('Sheets 데이터 로드 완료');
        }
      }
    } catch(e) {
      console.warn('Sheets 로드 실패, 로컬 데이터 사용:', e.message);
    }
  }
}

// ================================================================
//  로그인 / 세션
// ================================================================
async function handleLogin() {
  const pw    = document.getElementById('pw').value.trim();
  const errEl = document.getElementById('lerr');
  if (!pw) { errEl.textContent = '비밀번호를 입력하세요.'; return; }
  errEl.textContent = '확인 중…';

  // API_URL 미설정 → 로컬 모드
  if (!API_URL || API_URL.includes('YOUR_DEPLOY_ID')) {
    if (pw === '1424') {
      SESSION_TOKEN = 'local';
      sessionStorage.setItem('samter_session', 'local');
      errEl.textContent = '';
      showApp();
      initApp();
    } else {
      errEl.textContent = '비밀번호가 틀렸습니다.';
    }
    return;
  }

  // Google Sheets 로그인
  try {
    errEl.textContent = 'Sheets 연결 중…';
    const data = await apiCall({ action: 'login', password: pw });
    SESSION_TOKEN = data.sessionToken;
    sessionStorage.setItem('samter_session', SESSION_TOKEN);
    document.getElementById('pw').value = '';
    errEl.textContent = '';
    showApp();
    initApp();
  } catch(e) {
    errEl.textContent = '오류: ' + e.message;
  }
}

function showApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display   = 'block';
}

function loadLocalData() {
  try {
    const org = localStorage.getItem(ORG_KEY);
    if (org) allData = JSON.parse(org);
    const att = localStorage.getItem(ATT_KEY);
    if (att) attData = JSON.parse(att);
  } catch(e) {}
  if (!allData['2026']) allData['2026'] = BASE_2026;
  loadYear('2026');
}



// Sheets getOrg 반환 형식 → allData 형식 변환
// getOrg 반환: { '1지구': { order, samters:[{num,keeper,members[],samterOrder}] } }
function convertSheetsOrg(districts) {
  const result = [];
  Object.entries(districts).forEach(([distName, distInfo]) => {
    // distInfo = { order, samters:[] } 또는 구형 { '11': {keeper,members} }
    let samterList = [];
    if (distInfo && Array.isArray(distInfo.samters)) {
      // 새 형식
      samterList = distInfo.samters.map(s => ({
        num:     s.num,
        keeper:  s.keeper  || '',
        members: (s.members || []).filter(Boolean),
      }));
    } else if (distInfo && typeof distInfo === 'object') {
      // 구형 호환
      samterList = Object.entries(distInfo)
        .filter(([k]) => k !== 'order')
        .map(([num, info]) => ({
          num,
          keeper:  info.keeper  || '',
          members: (info.members || []).filter(Boolean),
        }));
    }
    if (samterList.length > 0) {
      result.push({ name: distName, samters: samterList });
    }
  });
  // 지구명 순서 정렬
  result.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return result;
}


// ================================================================
//  API 통신
//  - 쓰기(saveCell 등): no-cors GET (fire-and-forget, 서버엔 도달)
//  - 읽기(login, getOrg): script 태그 JSONP
// ================================================================

// ================================================================
//  API 통신 — JSONP 방식으로 통일 (CORS 완전 우회)
//  script 태그는 CORS 제한 없이 Apps Script에 도달
// ================================================================
function apiCall(data) {
  // 테스트 모드: 세션 토큰 없이 전송
  return new Promise((resolve, reject) => {
    const cbName = '__cb' + Date.now() + '_' + Math.floor(Math.random()*9999);
    const timer  = setTimeout(() => {
      delete window[cbName];
      const s = document.getElementById(cbName);
      if (s) s.remove();
      reject(new Error('응답 시간 초과 (15초)'));
    }, 15000);

    window[cbName] = function(json) {
      clearTimeout(timer);
      delete window[cbName];
      const s = document.getElementById(cbName);
      if (s) s.remove();
      if (!json.ok && json.code === 401) {
        SESSION_TOKEN = null;
        sessionStorage.removeItem('samter_session');
        document.getElementById('app').style.display   = 'none';
        document.getElementById('login').style.display = 'block';
        reject(new Error('세션 만료. 다시 로그인하세요.'));
        return;
      }
      if (!json.ok) { reject(new Error(json.error || '오류')); return; }
      resolve(json.data);
    };

    const url = API_URL
      + '?callback=' + cbName
      + '&payload=' + encodeURIComponent(JSON.stringify(data));

    const s = document.createElement('script');
    s.id  = cbName;
    s.src = url;
    s.onerror = () => {
      clearTimeout(timer);
      delete window[cbName];
      s.remove();
      reject(new Error('네트워크 오류 — Apps Script 배포 URL/권한 확인 필요'));
    };
    document.head.appendChild(s);
  });
}


// 셀 하나를 Sheets에 저장 (실패해도 무시 — 로컬엔 이미 저장됨)
async function syncCell(samter, type, index, value) {
  try {
    if (!value) {
      await apiCall({ action: 'deleteCell', year: currentYear,
                      samter, type, index: String(index) });
    } else {
      await apiCall({ action: 'saveCell', year: currentYear,
                      samter, type, index: String(index), value: String(value) });
    }
  } catch(e) {
    toast('셀 저장 오류: ' + e.message, 'err');
    throw e;
  }
}

// 샘터 메타 저장
async function syncMeta(samterNum, distName, distOrder, samterOrder) {
  try {
    await apiCall({ action: 'saveMeta', year: currentYear,
                    samter: samterNum, district: distName,
                    distOrder, samterOrder });
  } catch(e) { console.warn('메타 저장 실패:', e.message); }
}

// ================================================================
//  연도 패널
// ================================================================
function toggleYP() {
  const p = document.getElementById('yp');
  const willOpen = p.classList.contains('hidden');
  p.classList.toggle('hidden');
  if (willOpen) {
    refreshSavedList();
    document.getElementById('new-year-inp').value = '';
    document.getElementById('yp-err').textContent = '';
    setTimeout(() => document.getElementById('new-year-inp').focus(), 60);
  }
}
function closeYP() { document.getElementById('yp').classList.add('hidden'); }

function refreshSavedList() {
  document.getElementById('yp-cur-num').textContent = currentYear;
  const others = Object.keys(allData).filter(y => y !== currentYear)
    .map(Number).sort((a,b) => b-a);
  const savedEl = document.getElementById('yp-saved');
  const listEl  = document.getElementById('yp-saved-list');
  if (!others.length) { savedEl.classList.add('hidden'); return; }
  savedEl.classList.remove('hidden');
  listEl.innerHTML = '';
  others.forEach(y => {
    const div = document.createElement('div');
    div.className = 'yp-saved-item';
    div.innerHTML = `<span class="yn">${y}년</span><span class="yb-saved">저장됨</span>`;
    div.onclick = () => selectYear(String(y));
    listEl.appendChild(div);
  });
}

function submitNewYear() {
  const val  = document.getElementById('new-year-inp').value.trim();
  const errEl = document.getElementById('yp-err');
  const y    = parseInt(val);
  if (!val || isNaN(y) || y < 2024 || y > 2099) {
    errEl.textContent = '2024~2099 사이 연도를 입력하세요.'; return;
  }
  if (String(y) === currentYear) { errEl.textContent = '현재 연도입니다.'; return; }
  errEl.textContent = '';
  selectYear(String(y));
}

function selectYear(y) {
  closeYP();
  if (y === currentYear) return;
  saveCurrentToAllData();
  if (allData[y]) { loadYear(y); return; }
  pendingYear = y; selMode = null;
  showYearModal(y);
}

// ================================================================
//  연도 전환 모달
// ================================================================
function showYearModal(y) {
  document.getElementById('modal-area').innerHTML = `
    <div class="modal-bd">
      <div class="modal-box">
        <div class="modal-title">${y}년 조직표 만들기</div>
        <div class="modal-sub">${currentYear}년 조직표를 기반으로<br>${y}년 새 조직표를 시작합니다.</div>
        <div class="modal-opts">
          <button class="modal-opt" id="opt-copy" onclick="pickMode('copy')">
            <div class="opt-t">1. 현재 인원 그대로 사용</div>
            <div class="opt-d">${currentYear}년 샘터 구성과 조원 명단을<br>${y}년으로 그대로 복사합니다.</div>
          </button>
          <button class="modal-opt" id="opt-fresh" onclick="pickMode('fresh')">
            <div class="opt-t">2. 전면 재조정</div>
            <div class="opt-d">지구·샘터 구조만 유지하고<br>조원 명단을 비워 새로 입력합니다.</div>
          </button>
        </div>
        <div class="modal-btns">
          <button class="mb-cancel" onclick="cancelModal()">취소</button>
          <button class="mb-ok" id="mok" onclick="confirmModal()" disabled>확인</button>
        </div>
      </div>
    </div>`;
}
function pickMode(m) {
  selMode = m;
  document.querySelectorAll('.modal-opt').forEach(b => b.classList.remove('sel'));
  document.getElementById('opt-' + m).classList.add('sel');
  document.getElementById('mok').disabled = false;
}
function cancelModal() {
  document.getElementById('modal-area').innerHTML = '';
  pendingYear = null; selMode = null;
}
function confirmModal() {
  if (!selMode || !pendingYear) return;
  const y    = pendingYear;
  const prev = allData[currentYear] || [];
  allData[y] = selMode === 'copy'
    ? JSON.parse(JSON.stringify(prev))
    : prev.map(d => ({ name: d.name, samters: d.samters.map(s => ({ num: s.num, keeper: '', members: [] })) }));
  document.getElementById('modal-area').innerHTML = '';
  pendingYear = null; selMode = null;
  loadYear(y);
  toast(y + '년 조직표를 시작합니다', 'ok');
}

// ================================================================
//  연도 로드 / 저장
// ================================================================
function loadYear(y) {
  currentYear = y;
  document.getElementById('yd').textContent = y;
  const raw = allData[y] || [];
  state = raw.map((d, di) => ({
    id:      di + 1,
    name:    d.name,
    samters: d.samters.map((s, si) => ({
      id:     (di + 1) * 100 + si + 1,
      num:    s.num,
      keeper: s.keeper,
      rows:   toRows(s.members),
    })),
  }));
  render();
}

function saveCurrentToAllData() {
  allData[currentYear] = state.map(d => ({
    name:    d.name,
    samters: d.samters.map(s => ({
      num:     s.num,
      keeper:  s.keeper,
      members: s.rows.flat().filter(Boolean),
    })),
  }));
}

function saveLocalOrg() {
  try { localStorage.setItem(ORG_KEY, JSON.stringify(allData)); } catch(e) {}
}
function saveLocalAtt() {
  try { localStorage.setItem(ATT_KEY, JSON.stringify(attData)); } catch(e) {}
}

// ── 전체 저장 (비밀번호 확인 → Sheets + localStorage) ───────────
function saveOrg() {
  let ov = document.getElementById('save-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'save-overlay';
    ov.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.45);' +
      'display:flex;align-items:center;justify-content:center;z-index:9000;padding:20px';
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px 24px 22px;
                width:100%;max-width:320px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
      <div style="font-family:'Nanum Myeongjo',serif;font-size:1rem;color:#1a2744;
                  font-weight:800;margin-bottom:6px">저장 확인</div>
      <div style="font-size:.75rem;color:#888;margin-bottom:16px;line-height:1.5">
        ${currentYear}년 조직표를 Google Sheets에 저장합니다.<br>저장 비밀번호를 입력하세요.
      </div>
      <input type="password" id="save-pw" placeholder="저장 비밀번호"
        style="width:100%;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;
               font-size:1.1rem;text-align:center;letter-spacing:.25em;outline:none;
               margin-bottom:6px;font-family:inherit;transition:border-color .2s"
        onfocus="this.style.borderColor='#1a2744'"
        onblur="this.style.borderColor='#e0e0e0'"
        onkeydown="if(event.key==='Enter')confirmSave();if(event.key==='Escape')closeSaveOverlay()">
      <div id="save-pw-err"
        style="font-size:.72rem;color:#c0392b;min-height:16px;text-align:center;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px">
        <button onclick="closeSaveOverlay()"
          style="flex:1;padding:10px;border-radius:7px;font-size:.82rem;font-weight:600;
                 background:#f0f0f0;color:#555;border:none;cursor:pointer">취소</button>
        <button onclick="confirmSave()"
          style="flex:1;padding:10px;border-radius:7px;font-size:.82rem;font-weight:600;
                 background:#1a2744;color:#fff;border:none;cursor:pointer">저장</button>
      </div>
    </div>`;
  ov.style.display = 'flex';
  setTimeout(() => document.getElementById('save-pw')?.focus(), 60);
}

function closeSaveOverlay() {
  const ov = document.getElementById('save-overlay');
  if (ov) ov.style.display = 'none';
}

async function confirmSave() {
  // 테스트 모드: 비밀번호 없이 바로 저장
  closeSaveOverlay();
  saveCurrentToAllData();
  saveLocalOrg();
  toast('저장 중…', 'ok');
  await syncAllToSheets();
}

// 요청 사이 딜레이 (JSONP script 태그 충돌 방지)
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function syncAllToSheets() {
  let cellCount = 0;
  let errCount  = 0;
  toast('Sheets 동기화 시작…', 'ok');

  // 모든 셀을 순서대로 수집
  const tasks = [];
  for (let di = 0; di < state.length; di++) {
    const dist = state[di];
    for (let si = 0; si < dist.samters.length; si++) {
      const samter  = dist.samters[si];
      const members = samter.rows.flat().filter(Boolean);
      tasks.push({ action: 'saveMeta', year: currentYear,
                   samter: samter.num, district: dist.name,
                   distOrder: di, samterOrder: si });
      if (samter.keeper) {
        tasks.push({ action: 'saveCell', year: currentYear,
                     samter: samter.num, type: 'keeper', index: '0',
                     value: samter.keeper });
      }
      members.forEach((m, idx) => {
        if (m) tasks.push({ action: 'saveCell', year: currentYear,
                             samter: samter.num, type: 'member',
                             index: String(idx), value: m });
      });
    }
  }

  toast('총 ' + tasks.length + '개 셀 저장 중…', 'ok');

  // 하나씩 순차 처리 (200ms 간격)
  for (let i = 0; i < tasks.length; i++) {
    try {
      await apiCall(tasks[i]);
      cellCount++;
      // 10개마다 진행상황 표시
      if (cellCount % 10 === 0) {
        toast(cellCount + '/' + tasks.length + ' 저장 중…', 'ok');
      }
    } catch(e) {
      errCount++;
      console.warn('셀 저장 실패:', tasks[i], e.message);
    }
    await delay(200);  // 200ms 간격으로 요청
  }

  if (errCount === 0) {
    toast('Sheets 동기화 완료 (' + cellCount + '개) ✓', 'ok');
  } else {
    toast('완료 ' + cellCount + '개 / 실패 ' + errCount + '개', 'err');
  }
}

// ================================================================
//  지구 / 샘터 추가
// ================================================================
function addDistrict() {
  const n = state.length + 1;
  state.push({ id: Date.now(), name: n + '지구', samters: [] });
  render();
  toast(n + '지구 추가됨', 'ok');
}

function toggleDp() {
  const b = document.getElementById('dpb');
  b.classList.toggle('hidden');
  if (!b.classList.contains('hidden')) {
    document.getElementById('si').value = '';
    document.getElementById('dp-err').textContent = '';
    setTimeout(() => document.getElementById('si').focus(), 40);
  }
}
function closeDp() { document.getElementById('dpb').classList.add('hidden'); }

function doAddSamter() {
  const val  = document.getElementById('si').value.trim();
  const errEl = document.getElementById('dp-err');
  if (!val || isNaN(Number(val))) { errEl.textContent = '숫자를 입력하세요 (예: 14)'; return; }
  const dNum = parseInt(val[0]);
  const sNum = val;
  const dist = state.find(d => d.name === dNum + '지구');
  if (!dist) { errEl.textContent = dNum + '지구가 없습니다.'; return; }
  if (dist.samters.find(s => s.num === sNum)) { errEl.textContent = sNum + '샘터가 이미 있습니다.'; return; }
  const ns  = { id: nextSid++, num: sNum, keeper: '', rows: [['','','','','','','','','','']] };
  const idx = dist.samters.findIndex(s => parseInt(s.num) > parseInt(sNum));
  if (idx === -1) dist.samters.push(ns); else dist.samters.splice(idx, 0, ns);
  closeDp(); render();
  toast(sNum + '샘터를 ' + dist.name + '에 추가했습니다', 'ok');
}

// ================================================================
//  렌더링 — 단일 세로 배치, 한 행 10칸
// ================================================================
function render() {
  const tb = document.getElementById('tbody');
  tb.innerHTML = '';

  state.forEach((dist, di) => {
    if (di > 0) {
      const tr = document.createElement('tr'); tr.className = 'r-dist-sep';
      const td = document.createElement('td'); td.colSpan = 3;
      tr.appendChild(td); tb.appendChild(tr);
    }

    // 지구 헤더
    const chief = dist.samters[0]?.keeper || '-';
    const hdr   = document.createElement('tr'); hdr.className = 'r-dh';

    const tdNum = document.createElement('td');
    tdNum.style.cssText = 'width:44px;text-align:center;border-right:2px solid rgba(255,255,255,.28)';
    tdNum.textContent = '샘터'; hdr.appendChild(tdNum);

    const tdK = document.createElement('td');
    tdK.style.cssText = 'width:94px;text-align:center;border-right:2px solid rgba(255,255,255,.28)';
    tdK.textContent = '청지기'; hdr.appendChild(tdK);

    const tdT = document.createElement('td');
    tdT.style.textAlign = 'center';
    const nameInp = document.createElement('input');
    nameInp.value = dist.name;
    nameInp.style.cssText = 'background:transparent;border:none;color:#fff;font-weight:700;font-size:.8rem;padding:0;font-family:inherit;width:50px;text-align:center;outline:none';
    nameInp.addEventListener('input', function() { dist.name = this.value; });
    const chiefSpan = document.createElement('span');
    chiefSpan.style.cssText = 'font-size:.72rem;opacity:.9';
    chiefSpan.innerHTML = '&nbsp;(지구장:&nbsp;<strong id="chief-' + dist.id + '">' + chief + '</strong>)';
    tdT.appendChild(nameInp);
    tdT.appendChild(chiefSpan);

    // 샘터 없을 때 X 삭제 버튼
    if (dist.samters.length === 0) {
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style.cssText = 'margin-left:10px;background:rgba(255,80,80,.25);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:.65rem;cursor:pointer;outline:none';
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx = state.indexOf(dist);
        if (idx !== -1) { state.splice(idx, 1); render(); toast(dist.name + ' 삭제됨', 'ok'); }
      });
      tdT.appendChild(delBtn);
    }
    hdr.appendChild(tdT);
    tb.appendChild(hdr);

    if (!dist.samters.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td'); td.colSpan = 3; td.className = 'empty-d';
      td.textContent = '＋ 샘터 추가 버튼으로 샘터를 추가하세요';
      tr.appendChild(td); tb.appendChild(tr);
      return;
    }

    dist.samters.forEach((samter, si) => {
      if (si > 0) {
        const sep = document.createElement('tr'); sep.className = 'r-sep';
        const std = document.createElement('td'); std.colSpan = 3;
        sep.appendChild(std); tb.appendChild(sep);
      }

      const memberCount = samter.rows.flat().filter(Boolean).length + (samter.keeper ? 1 : 0);
      const rs = samter.rows.length;

      samter.rows.forEach((row10, ri) => {
        const tr = document.createElement('tr'); tr.className = 'r-s';

        if (ri === 0) {
          // 샘터 번호 칸
          const tn = document.createElement('td'); tn.className = 'cn'; tn.rowSpan = rs;
          const numInp = document.createElement('input');
          numInp.value = samter.num; numInp.placeholder = '번호';
          numInp.style.cssText = 'width:100%;border:none;background:transparent;text-align:center;font-weight:700;font-size:.85rem;color:var(--navy);padding:4px 2px;outline:none;font-family:inherit';
          numInp.addEventListener('input', function() { samter.num = this.value; });
          tn.appendChild(numInp); tr.appendChild(tn);

          // 청지기 + 인원수 칸
          const tk = document.createElement('td'); tk.className = 'ck'; tk.rowSpan = rs;
          const keeperInp = document.createElement('input');
          keeperInp.value = samter.keeper; keeperInp.placeholder = '청지기';
          keeperInp.id = 'kp-' + samter.id;
          keeperInp.style.cssText = 'width:100%;border:none;background:transparent;text-align:center;font-size:.74rem;padding:2px;display:block;outline:none;font-family:inherit';
          keeperInp.addEventListener('input', function() {
            samter.keeper = this.value;
            if (si === 0) {
              const el = document.getElementById('chief-' + dist.id);
              if (el) el.textContent = this.value || '-';
            }
            const cnt = samter.rows.flat().filter(Boolean).length + (this.value ? 1 : 0);
            const cc  = document.getElementById('cc-' + samter.id);
            if (cc) cc.textContent = '(' + cnt + '명)';
          });
          keeperInp.addEventListener('change', function() {
            syncCell(samter.num, 'keeper', 0, this.value);
          });
          keeperInp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === 'Tab') {
              syncCell(samter.num, 'keeper', 0, this.value);
            }
          });
          const countDiv = document.createElement('div');
          countDiv.className = 'ck-count'; countDiv.id = 'cc-' + samter.id;
          countDiv.textContent = '(' + memberCount + '명)';
          tk.appendChild(keeperInp); tk.appendChild(countDiv); tr.appendChild(tk);
        }

        // 멤버 10칸 그리드
        const tm = document.createElement('td'); tm.className = 'cm';
        const g  = document.createElement('div'); g.className = 'mg'; g.id = `g-${samter.id}-${ri}`;

        row10.forEach((v, ci) => {
          const c   = document.createElement('div'); c.className = 'mc';
          const inp = document.createElement('input');
          inp.value       = v;
          inp.placeholder = (ri * 10 + ci + 1) + '번';
          inp.addEventListener('input', function() {
            row10[ci] = this.value;
            const cnt = samter.rows.flat().filter(Boolean).length + (samter.keeper ? 1 : 0);
            const cc  = document.getElementById('cc-' + samter.id);
            if (cc) cc.textContent = '(' + cnt + '명)';
            updateStat();
          });
          inp.addEventListener('change', function() {
            // 포커스 벗어날 때 Sheets 동기화
            const globalIdx = ri * 10 + ci;
            syncCell(samter.num, 'member', globalIdx, this.value);
          });
          inp.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            // Enter 시 현재 값 즉시 동기화
            const globalIdx = ri * 10 + ci;
            syncCell(samter.num, 'member', globalIdx, this.value);

            if (ci < 9) {
              g.querySelectorAll('input')[ci + 1]?.focus();
            } else {
              const nri = ri + 1;
              if (nri >= samter.rows.length) {
                samter.rows.push(['','','','','','','','','','']);
                render();
                setTimeout(() => {
                  document.getElementById(`g-${samter.id}-${nri}`)
                    ?.querySelectorAll('input')[0]?.focus();
                }, 20);
              } else {
                document.getElementById(`g-${samter.id}-${nri}`)
                  ?.querySelectorAll('input')[0]?.focus();
              }
            }
          });
          c.appendChild(inp); g.appendChild(c);
        });
        tm.appendChild(g); tr.appendChild(tm); tb.appendChild(tr);
      });
    });
  });
  updateStat();
}

function updateStat() {
  const d = state.length;
  const s = state.reduce((a, ds) => a + ds.samters.length, 0);
  const m = state.reduce((a, ds) =>
    a + ds.samters.reduce((b, sm) =>
      b + sm.rows.flat().filter(Boolean).length + (sm.keeper ? 1 : 0), 0), 0);
  const el = document.getElementById('stat');
  if (el) el.textContent = currentYear + '년 · ' + d + '지구 · ' + s + '샘터 · 총 ' + m + '명';
}

// ================================================================
//  유틸
// ================================================================
function toRows(members) {
  const a = members || [];
  const r = [];
  for (let i = 0; i < Math.max(a.length, 1); i += 10)
    r.push([a[i]||'',a[i+1]||'',a[i+2]||'',a[i+3]||'',a[i+4]||'',
            a[i+5]||'',a[i+6]||'',a[i+7]||'',a[i+8]||'',a[i+9]||'']);
  if (!r.length) r.push(['','','','','','','','','','']);
  return r;
}

function getSamterByNum(num) {
  for (const dist of state) {
    const s = dist.samters.find(s => s.num === String(num));
    if (s) return s;
  }
  return null;
}

function getDistrictChief(samterNum) {
  for (const dist of state) {
    if (dist.samters.find(s => s.num === String(samterNum)))
      return dist.samters[0]?.keeper || '-';
  }
  return '-';
}

function getMemberList(samterNum) {
  const s = getSamterByNum(samterNum);
  if (!s) return [];
  const members = s.rows.flat().filter(Boolean);
  if (s.keeper && !members.includes(s.keeper)) return [s.keeper, ...members];
  return members;
}

function buildSamterOptions() {
  let opts = '<option value="">-- 샘터 선택 --</option>';
  state.forEach(dist => {
    dist.samters.forEach(s => {
      opts += `<option value="${s.num}">${s.num}샘터 (${s.keeper})</option>`;
    });
  });
  return opts;
}

// ================================================================
//  자료제공 드롭다운
// ================================================================
function toggleExport() {
  const b = document.getElementById('expb');
  b.classList.toggle('hidden');
}
function closeExport() {
  const b = document.getElementById('expb');
  if (b) b.classList.add('hidden');
}

function doExport(type) {
  closeExport();
  if (type === 'gdocs')   return exportToGoogleDocs();
  if (type === 'monthly') return openMonthlyModal();
  if (type === 'yearly')  return openYearlyModal();
}

// ── 조직표 출력 (Google Docs 붙여넣기용) ───────────────────────
function exportToGoogleDocs() {
  saveCurrentToAllData();
  let tableRows = '';
  state.forEach((dist, di) => {
    const chief = dist.samters[0]?.keeper || '-';
    tableRows += `<tr style="background:#3a5a8c;color:#fff">
      <td style="padding:6px 10px;font-weight:700;text-align:center;border:1px solid #2a4a7c">샘터</td>
      <td style="padding:6px 10px;font-weight:700;text-align:center;border:1px solid #2a4a7c">청지기</td>
      <td colspan="10" style="padding:6px 14px;font-weight:700;border:1px solid #2a4a7c">
        ${dist.name}&nbsp;<span style="font-weight:400;font-size:.9em">(지구장: ${chief})</span>
      </td></tr>`;

    dist.samters.forEach((samter) => {
      const allM = samter.keeper
        ? [samter.keeper, ...samter.rows.flat().filter(Boolean)]
        : samter.rows.flat().filter(Boolean);
      const count = allM.length;
      for (let r = 0; r < Math.max(allM.length, 1); r += 10) {
        const isFirst = r === 0;
        const chunk   = allM.slice(r, r + 10);
        while (chunk.length < 10) chunk.push('');
        tableRows += '<tr>';
        if (isFirst) {
          tableRows += `
            <td rowspan="${Math.ceil(Math.max(allM.length,1)/10)}"
              style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-weight:700;background:#e8eef7;vertical-align:middle">${samter.num}</td>
            <td rowspan="${Math.ceil(Math.max(allM.length,1)/10)}"
              style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:.85em;background:#f2f5fa;vertical-align:middle">
              ${samter.keeper}<br><span style="color:#3a5a8c;font-size:.85em">(${count}명)</span></td>`;
        }
        chunk.forEach(n => {
          tableRows += `<td style="border:1px solid #ddd;padding:4px 6px;font-size:.88em">${n}</td>`;
        });
        tableRows += '</tr>';
      }
    });
    if (di < state.length - 1)
      tableRows += `<tr><td colspan="12" style="height:8px;background:#f5f3ee;border:none"></td></tr>`;
  });

  const totalM = state.reduce((a,d) => a + d.samters.reduce((b,s) =>
    b + s.rows.flat().filter(Boolean).length + (s.keeper?1:0), 0), 0);

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>시카고 언약 장로교회 ${currentYear}년 샘터 조직표</title>
<style>
  body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;padding:30px;color:#1a1a1a}
  h1{font-family:'Nanum Myeongjo',serif;font-size:18px;color:#1a2744;text-align:center;margin-bottom:4px;font-weight:800}
  .sub{text-align:center;font-size:12px;color:#888;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  .guide{background:#fff8e8;border:1px solid #f0d080;border-radius:6px;padding:12px 16px;font-size:12px;color:#6b4c00;margin-bottom:16px;line-height:1.7}
  .btn{display:inline-block;margin:4px 6px 0 0;padding:8px 18px;background:#1a2744;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit;text-decoration:none}
  .btn-g{background:#0f9d58}
  @media print{.guide,.btn-row{display:none}}
</style></head><body>
<h1>시카고 언약 장로교회 ${currentYear}년 샘터 조직표</h1>
<p class="sub">${state.length}지구 · ${state.reduce((a,d)=>a+d.samters.length,0)}샘터 · 총 ${totalM}명</p>
<div class="guide">
  <strong>Google Docs 붙여넣기 방법:</strong><br>
  1. 아래 <strong>"표 전체 선택"</strong> 버튼 클릭 → 복사(Ctrl+C)<br>
  2. <a href="https://docs.google.com/document/create" target="_blank" style="color:#1a2744;font-weight:700">Google Docs 새 문서</a> 열기 → 붙여넣기(Ctrl+V)
</div>
<div class="btn-row" style="margin-bottom:14px">
  <button class="btn" onclick="selectAll()">📋 표 전체 선택</button>
  <a class="btn btn-g" href="https://docs.google.com/document/create" target="_blank">🔗 Google Docs 열기</a>
  <button class="btn" onclick="window.print()">🖨 인쇄</button>
</div>
<div id="tw"><table><tbody>${tableRows}</tbody></table></div>
<script>
function selectAll(){
  const r=document.createRange();r.selectNodeContents(document.getElementById('tw'));
  const s=window.getSelection();s.removeAllRanges();s.addRange(r);
  try{document.execCommand('copy');alert('복사 완료! Google Docs에 붙여넣기 하세요.');}
  catch(e){alert('Ctrl+A 후 Ctrl+C로 복사하세요.');}
}
<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (!win) { toast('팝업 차단됨. 팝업 허용 후 재시도하세요.', 'err'); return; }
  win.document.write(html);
  win.document.close();
  toast('조직표 출력 창이 열렸습니다', 'ok');
}

// ================================================================
//  월 샘터 보고서
// ================================================================
function openMonthlyModal() {
  const mOpts   = [1,2,3,4,5,6,7,8,9,10,11,12].map(m =>
    `<option value="${m}">${m}월</option>`).join('');
  const samOpts = buildSamterOptions();
  const now     = new Date();
  openFullModal(`
    <div style="background:#fff;border-radius:12px;width:100%;max-width:780px;
                padding:28px 24px 24px;position:relative;margin:auto">
      <button onclick="closeFullModal()"
        style="position:absolute;top:14px;right:16px;background:#f0f0f0;border:none;
               border-radius:50%;width:28px;height:28px;font-size:.8rem;cursor:pointer">✕</button>
      <h2 style="font-family:'Nanum Myeongjo',serif;font-size:1.05rem;color:#1a2744;
                 font-weight:800;margin-bottom:16px">📋 월 샘터 보고서</h2>
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <select id="mr-samter" onchange="renderMonthlyForm()"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">${samOpts}</select>
        <select id="mr-month" onchange="renderMonthlyForm()"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">${mOpts}</select>
        <input id="mr-date" type="text" placeholder="모임일시 (예: 02/08/26)"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;width:140px;font-family:inherit">
        <input id="mr-place" type="text" placeholder="모임장소 (예: 203호)"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;width:110px;font-family:inherit">
      </div>
      <div id="monthly-form-body"></div>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        <button onclick="saveMonthlyData()"
          style="padding:9px 20px;background:#2d6a4f;color:#fff;border:none;border-radius:7px;font-size:.82rem;font-weight:600;cursor:pointer">💾 저장 (Sheets)</button>
        <button onclick="printMonthlyReport()"
          style="padding:9px 20px;background:#1a2744;color:#fff;border:none;border-radius:7px;font-size:.82rem;font-weight:600;cursor:pointer">🖨 인쇄</button>
        <button onclick="closeFullModal()"
          style="padding:9px 16px;background:#f0f0f0;color:#555;border:none;border-radius:7px;font-size:.82rem;cursor:pointer">닫기</button>
      </div>
    </div>`);
  document.getElementById('mr-month').value = now.getMonth() + 1;
  renderMonthlyForm();
}

async function renderMonthlyForm() {
  const samterNum = document.getElementById('mr-samter')?.value;
  const month     = document.getElementById('mr-month')?.value;
  const body      = document.getElementById('monthly-form-body');
  if (!samterNum || !body) return;

  const members = getMemberList(samterNum);
  const samter  = getSamterByNum(samterNum);
  if (!members.length) { body.innerHTML = '<p style="color:#888;font-size:.82rem">조원이 없습니다.</p>'; return; }

  // 로컬 캐시 먼저 사용, 그다음 Sheets
  let saved = attData[currentYear]?.[samterNum]?.[month] || null;
  if (!saved) {
    try {
      const res = await apiCall({ action: 'getAtt', year: currentYear, samter: samterNum, month });
      if (res.data) {
        saved = res.data;
        if (!attData[currentYear]) attData[currentYear] = {};
        if (!attData[currentYear][samterNum]) attData[currentYear][samterNum] = {};
        attData[currentYear][samterNum][month] = saved;
        saveLocalAtt();
      }
    } catch(e) {}
  }
  saved = saved || {};

  const attCount = members.filter(m => (saved[m]||'') === 'O').length;
  const total    = members.length;
  const rate     = total > 0 ? Math.round(attCount / total * 100) : 0;
  const half     = Math.ceil(members.length / 2);

  function makeRows(list, offset) {
    return list.map((name, i) => {
      const v = saved[name] || '';
      return `<div style="display:grid;grid-template-columns:28px 1fr 44px 1fr;border-bottom:0.5px solid #eee">
        <span style="padding:4px;text-align:center;font-size:.75rem;border-right:1px solid #eee">${offset+i+1}</span>
        <span style="padding:4px 6px;font-size:.78rem;border-right:1px solid #eee">${name}</span>
        <span style="padding:2px;text-align:center;border-right:1px solid #eee">
          <select data-member="${name}" class="att-sel"
            style="border:1px solid #ddd;border-radius:3px;font-size:.75rem;padding:1px;width:40px;font-family:inherit">
            <option value=""  ${v===''  ?'selected':''}>　</option>
            <option value="O" ${v==='O' ?'selected':''}>O</option>
            <option value="X" ${v==='X' ?'selected':''}>X</option>
          </select>
        </span>
        <span style="padding:2px 4px">
          <input type="text" data-reason="${name}" class="att-reason"
            value="${saved[name+'_reason']||''}" placeholder="결석사유"
            style="border:none;width:100%;font-size:.74rem;family:inherit;outline:none">
        </span>
      </div>`;
    }).join('');
  }

  body.innerHTML = `
    <div style="border:1.5px solid #1a2744;border-radius:4px;overflow:hidden;margin-bottom:10px">
      <table style="width:100%;border-collapse:collapse;background:#e8edf7">
        <tr style="font-size:.77rem;font-weight:700;color:#1a2744">
          <td style="padding:6px 10px;border:1px solid #b8c8e0">샘터</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0;font-weight:800">${samterNum}</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0">청지기</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0">${samter?.keeper||''}</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0">지구장</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0">${getDistrictChief(samterNum)}</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0">총원</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0">${total}명</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0">참석</td>
          <td id="att-count-cell" style="padding:6px 10px;border:1px solid #b8c8e0;font-weight:700;color:#2d6a4f">${attCount}명</td>
          <td style="padding:6px 10px;border:1px solid #b8c8e0">출석률</td>
          <td id="att-rate-cell" style="padding:6px 10px;border:1px solid #b8c8e0;font-weight:700;color:#3a5a8c">${rate}%</td>
        </tr>
      </table>
      <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ddd">
        <div>
          <div style="display:grid;grid-template-columns:28px 1fr 44px 1fr;background:#3a5a8c;color:#fff;font-size:.73rem">
            <span style="padding:5px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">번호</span>
            <span style="padding:5px;border-right:1px solid rgba(255,255,255,.2)">성명</span>
            <span style="padding:5px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">출결</span>
            <span style="padding:5px">결석사유</span>
          </div>
          ${makeRows(members.slice(0, half), 0)}
        </div>
        <div style="border-left:1px solid #ddd">
          <div style="display:grid;grid-template-columns:28px 1fr 44px 1fr;background:#3a5a8c;color:#fff;font-size:.73rem">
            <span style="padding:5px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">번호</span>
            <span style="padding:5px;border-right:1px solid rgba(255,255,255,.2)">성명</span>
            <span style="padding:5px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">출결</span>
            <span style="padding:5px">결석사유</span>
          </div>
          ${makeRows(members.slice(half), half)}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="border:1px solid #ddd;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600;width:70px">새교우</td>
            <td style="border:1px solid #ddd;padding:5px"><input id="mr-new" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="${saved['_new']||''}"></td></tr>
        <tr><td style="border:1px solid #ddd;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600">보고사항</td>
            <td style="border:1px solid #ddd;padding:5px"><input id="mr-report" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="${saved['_report']||''}"></td></tr>
        <tr><td style="border:1px solid #ddd;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600">건의사항</td>
            <td style="border:1px solid #ddd;padding:5px"><input id="mr-suggest" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="${saved['_suggest']||''}"></td></tr>
      </table>
    </div>`;

  // 출석 변경 시 실시간 카운트 + 출석률
  body.querySelectorAll('.att-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      const cnt  = [...body.querySelectorAll('.att-sel')].filter(s => s.value === 'O').length;
      const tot  = body.querySelectorAll('.att-sel').length;
      const r    = tot > 0 ? Math.round(cnt / tot * 100) : 0;
      const cEl  = document.getElementById('att-count-cell');
      const rEl  = document.getElementById('att-rate-cell');
      if (cEl) cEl.textContent = cnt + '명';
      if (rEl) rEl.textContent = r + '%';
    });
  });
}

async function saveMonthlyData() {
  const samterNum = document.getElementById('mr-samter')?.value;
  const month     = document.getElementById('mr-month')?.value;
  if (!samterNum || !month) { toast('샘터와 월을 선택하세요', 'err'); return; }

  const rec = {};
  document.querySelectorAll('.att-sel').forEach(s   => { rec[s.dataset.member] = s.value; });
  document.querySelectorAll('.att-reason').forEach(i => { if (i.value) rec[i.dataset.reason + '_reason'] = i.value; });
  rec['_new']     = document.getElementById('mr-new')?.value    || '';
  rec['_report']  = document.getElementById('mr-report')?.value || '';
  rec['_suggest'] = document.getElementById('mr-suggest')?.value || '';

  // localStorage 저장
  if (!attData[currentYear]) attData[currentYear] = {};
  if (!attData[currentYear][samterNum]) attData[currentYear][samterNum] = {};
  attData[currentYear][samterNum][month] = rec;
  saveLocalAtt();

  // Google Sheets 저장
  try {
    await apiCall({ action: 'saveAtt', year: currentYear, samter: samterNum, month, record: rec });
    toast(samterNum + '샘터 ' + month + '월 보고서 Sheets 저장 완료', 'ok');
  } catch(e) {
    toast('보고서가 저장되었습니다 ✓', 'ok');
  }
  renderMonthlyForm();
}

function printMonthlyReport() {
  saveMonthlyData();
  const body = document.getElementById('monthly-form-body');
  if (!body) return;
  const samterNum = document.getElementById('mr-samter').value;
  const month     = document.getElementById('mr-month').value;
  const date      = document.getElementById('mr-date').value;
  const place     = document.getElementById('mr-place').value;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <title>${samterNum}샘터 ${month}월 보고서</title>
    <style>body{font-family:'Noto Sans KR',sans-serif;padding:20px;font-size:12px}
    h2{font-family:'Nanum Myeongjo',serif;color:#1a2744;margin-bottom:8px}
    @media print{button{display:none}}</style></head><body>
    <h2>2026년 시카고 언약장로교회 말씀의 샘터부 보고서</h2>
    <p style="font-size:11px;color:#888;margin-bottom:8px">모임일시: ${date||'　　'} &nbsp; 모임장소: ${place||'　　'}</p>
    ${body.innerHTML}
    <p style="font-size:10px;color:#888;margin-top:12px">보고서 제출은 본당 예배실 Lobby 책장위에 있는 각 지구함에 넣어 주세요.</p>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
  win.document.close();
}

// ================================================================
//  년중 출석 상황
// ================================================================
function openYearlyModal() {
  openFullModal(`
    <div style="background:#fff;border-radius:12px;width:100%;max-width:920px;
                padding:28px 24px 24px;position:relative;margin:auto">
      <button onclick="closeFullModal()"
        style="position:absolute;top:14px;right:16px;background:#f0f0f0;border:none;
               border-radius:50%;width:28px;height:28px;font-size:.8rem;cursor:pointer">✕</button>
      <h2 style="font-family:'Nanum Myeongjo',serif;font-size:1.05rem;color:#1a2744;
                 font-weight:800;margin-bottom:16px">📅 년중 샘터 출석 상황 (${currentYear}년)</h2>
      <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;flex-wrap:wrap">
        <select id="yr-samter" onchange="renderYearlyTable()"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">
          ${buildSamterOptions()}
        </select>
        <button onclick="loadYearlyFromSheets()"
          style="padding:7px 14px;background:#3a5a8c;color:#fff;border:none;border-radius:6px;font-size:.78rem;cursor:pointer">
          🔄 Sheets에서 불러오기</button>
        <button onclick="printYearlyReport()"
          style="padding:7px 14px;background:#1a2744;color:#fff;border:none;border-radius:6px;font-size:.78rem;cursor:pointer">🖨 인쇄</button>
        <button onclick="closeFullModal()"
          style="padding:7px 12px;background:#f0f0f0;color:#555;border:none;border-radius:6px;font-size:.78rem;cursor:pointer">닫기</button>
      </div>
      <div id="yearly-table-body" style="overflow-x:auto"></div>
    </div>`);
  renderYearlyTable();
}

async function loadYearlyFromSheets() {
  const samterNum = document.getElementById('yr-samter')?.value;
  if (!samterNum) return;
  try {
    const res = await apiCall({ action: 'getAllAtt', year: currentYear, samter: samterNum });
    if (res.months) {
      if (!attData[currentYear]) attData[currentYear] = {};
      if (!attData[currentYear][samterNum]) attData[currentYear][samterNum] = {};
      Object.assign(attData[currentYear][samterNum], res.months);
      saveLocalAtt();
      renderYearlyTable();
      toast('Sheets에서 출석 데이터 로드 완료', 'ok');
    }
  } catch(e) { toast('데이터 로드 실패: ' + e.message, 'err'); }
}

function renderYearlyTable() {
  const samterNum = document.getElementById('yr-samter')?.value;
  const body      = document.getElementById('yearly-table-body');
  if (!samterNum || !body) return;

  const members = getMemberList(samterNum);
  const mLabels = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  let html = `<table style="width:100%;border-collapse:collapse;font-size:.75rem;min-width:700px">
    <thead><tr style="background:#1a2744;color:#fff">
      <th style="padding:7px 8px;border:1px solid rgba(255,255,255,.2);text-align:left;min-width:30px">번호</th>
      <th style="padding:7px 8px;border:1px solid rgba(255,255,255,.2);text-align:left;min-width:90px">성명</th>`;
  mLabels.forEach(m => {
    html += `<th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:40px">${m}</th>`;
  });
  html += `<th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:55px">출석달수<br><span style="font-size:.65rem;opacity:.8">(12개월중)</span></th>
           <th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:44px">출석률</th>
    </tr></thead><tbody>`;

  members.forEach((name, idx) => {
    let attMonths = 0;
    let cells = '';
    for (let m = 1; m <= 12; m++) {
      const rec = attData[currentYear]?.[samterNum]?.[m];
      if (!rec) { cells += `<td style="border:1px solid #ddd;text-align:center;color:#ccc">-</td>`; continue; }
      const v = rec[name] || '';
      if (v === 'O') attMonths++;
      const color = v==='O'?'#2d6a4f':v==='X'?'#c0392b':'#888';
      cells += `<td style="border:1px solid #ddd;text-align:center;color:${color};font-weight:${v?'700':'400'}">${v||'·'}</td>`;
    }
    const rate      = Math.round(attMonths / 12 * 100);
    const rateColor = rate >= 80 ? '#2d6a4f' : rate >= 50 ? '#856404' : '#c0392b';
    html += `<tr style="background:${idx%2===0?'#fff':'#f9fafc'}">
      <td style="border:1px solid #ddd;padding:5px 6px;text-align:center">${idx+1}</td>
      <td style="border:1px solid #ddd;padding:5px 8px">${name}</td>
      ${cells}
      <td style="border:1px solid #ddd;padding:5px 4px;text-align:center;font-weight:700;color:#1a2744">${attMonths}/12</td>
      <td style="border:1px solid #ddd;padding:5px 4px;text-align:center;font-weight:700;color:${rateColor}">${rate}%</td>
    </tr>`;
  });

  // 월별 참석 합계
  html += `<tr style="background:#e8edf7;font-weight:700">
    <td style="border:1px solid #ddd;padding:5px 6px;text-align:center" colspan="2">월별 참석수</td>`;
  for (let m = 1; m <= 12; m++) {
    const rec = attData[currentYear]?.[samterNum]?.[m];
    if (!rec) { html += `<td style="border:1px solid #ddd;text-align:center;color:#bbb">-</td>`; continue; }
    const cnt = members.filter(n => rec[n] === 'O').length;
    html += `<td style="border:1px solid #ddd;text-align:center">${cnt}</td>`;
  }
  html += `<td style="border:1px solid #ddd" colspan="2"></td></tr>`;
  html += '</tbody></table>';
  body.innerHTML = html;
}

function printYearlyReport() {
  const samterNum = document.getElementById('yr-samter')?.value;
  const body      = document.getElementById('yearly-table-body');
  if (!body) return;
  const samter = getSamterByNum(samterNum);
  const win    = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <title>${samterNum}샘터 년중 출석상황</title>
    <style>body{font-family:'Noto Sans KR',sans-serif;padding:16px;font-size:11px}
    h2{font-family:'Nanum Myeongjo',serif;color:#1a2744;margin-bottom:8px}
    table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:3px 5px}
    @media print{button{display:none}}</style></head><body>
    <h2>${currentYear}년 시카고 언약장로교회 ${samterNum}샘터 년중 출석 상황</h2>
    <p style="font-size:10px;color:#888;margin-bottom:8px">청지기: ${samter?.keeper||''}</p>
    ${body.innerHTML}
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
  win.document.close();
}

// ================================================================
//  공통 모달 오버레이
// ================================================================
function openFullModal(html) {
  let ov = document.getElementById('full-modal');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'full-modal';
    ov.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:8000;' +
      'overflow-y:auto;padding:20px;display:flex;justify-content:center;align-items:flex-start';
    document.body.appendChild(ov);
  }
  ov.innerHTML = html;
  ov.style.display = 'flex';
}
function closeFullModal() {
  const ov = document.getElementById('full-modal');
  if (ov) ov.style.display = 'none';
}

// ================================================================
//  토스트 / 외부 클릭 닫기 / ESC
// ================================================================
let _toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = type === 'ok' ? '✓ ' + msg : '✕ ' + msg;
  el.className   = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

document.addEventListener('click', function(e) {
  if (!document.getElementById('yw')?.contains(e.target))   closeYP();
  if (!document.getElementById('dpw')?.contains(e.target))  closeDp();
  if (!document.getElementById('expw')?.contains(e.target)) closeExport();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeYP(); closeDp(); cancelModal(); closeSaveOverlay(); closeFullModal();
  }
});
