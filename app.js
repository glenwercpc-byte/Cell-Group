// ================================================================
//  시카고 언약 장로교회 샘터 조직표 — app.js  (최종)
//  - 연도별 조직표 관리 (현재 고정 + 새 연도 직접 입력)
//  - 샘터 추가: 번호 입력으로 해당 지구에 자동 삽입
//  - 5번째 칸 Enter → 자동 줄 추가
//  - 청지기 칸에 총 인원수 표시
//  - 엑셀 내보내기
// ================================================================

// ★ Apps Script 배포 후 아래 URL을 교체하세요
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec';
const STORAGE_KEY = 'samter_org_final';

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

// ── 전역 상태 ────────────────────────────────────────────────────
let allData = {};        // { '2026': [...raw...], '2027': [...] }
let currentYear = '2026';
let state = [];          // 현재 연도 작업 상태 (districts)
let nextSid = 500;
let pendingYear = null;
let selMode = null;

// ================================================================
//  초기화
// ================================================================
window.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('samter_token');
  if (token) {
    showApp();
    initData();
  }
});

function initData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) allData = JSON.parse(saved);
  } catch (e) {}
  if (!allData['2026']) allData['2026'] = BASE_2026;
  loadYear('2026');
}

// ================================================================
//  인증
// ================================================================
async function login() {
  const pw  = document.getElementById('pw').value.trim();
  const err = document.getElementById('lerr');
  if (!pw) { err.textContent = '비밀번호를 입력하세요.'; return; }
  err.textContent = '';

  try {
    const res = await apiCall({ action: 'login', password: pw }, false);
    sessionStorage.setItem('samter_token', res.sessionToken);
    document.getElementById('pw').value = '';
    showApp();
    initData();
  } catch (e) {
    // API 연결 전 로컬 모드로도 동작
    if (pw === 'samter2026') {
      sessionStorage.setItem('samter_token', 'local');
      document.getElementById('pw').value = '';
      showApp();
      initData();
    } else {
      err.textContent = '비밀번호가 틀렸습니다.';
    }
  }
}

async function logout() {
  try { await apiCall({ action: 'logout' }); } catch (_) {}
  sessionStorage.removeItem('samter_token');
  allData = {}; state = []; currentYear = '2026';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login').style.display = 'flex';
  document.getElementById('pw').value = '';
}

function showApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

// ================================================================
//  API 통신
// ================================================================
async function apiCall(data, useToken = true) {
  if (useToken) {
    const token = sessionStorage.getItem('samter_token');
    if (token && token !== 'local') data.sessionToken = token;
  }
  const res  = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || '서버 오류');
  return json.data;
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

function closeYP() {
  document.getElementById('yp').classList.add('hidden');
}

function refreshSavedList() {
  document.getElementById('yp-cur-num').textContent = currentYear;

  const others = Object.keys(allData)
    .filter(y => y !== currentYear)
    .map(Number).sort((a, b) => b - a);

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
  const y = parseInt(val);
  if (!val || isNaN(y) || y < 2024 || y > 2099) {
    errEl.textContent = '2024~2099 사이 연도를 입력하세요.'; return;
  }
  if (String(y) === currentYear) {
    errEl.textContent = '현재 연도입니다.'; return;
  }
  errEl.textContent = '';
  selectYear(String(y));
}

function selectYear(y) {
  closeYP();
  if (y === currentYear) return;
  saveCurrentToAllData();
  if (allData[y]) { loadYear(y); return; }
  // 새 연도 → 모달
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
    : prev.map(d => ({
        name: d.name,
        samters: d.samters.map(s => ({ num: s.num, keeper: '', members: [] }))
      }));
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
    id: di + 1,
    name: d.name,
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

function saveOrg() {
  saveCurrentToAllData();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    toast('저장 완료 ✓', 'ok');
    // Apps Script에도 저장 시도 (오프라인이면 무시)
    apiCall({ action: 'saveOrg', year: currentYear, districts: allData[currentYear] })
      .catch(() => {});
  } catch (e) {
    toast('저장 실패: ' + e.message, 'err');
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

  const ns  = { id: nextSid++, num: sNum, keeper: '', rows: [['','','','','']] };
  const idx = dist.samters.findIndex(s => parseInt(s.num) > parseInt(sNum));
  if (idx === -1) dist.samters.push(ns); else dist.samters.splice(idx, 0, ns);

  closeDp();
  render();
  toast(sNum + '샘터를 ' + dist.name + '에 추가했습니다', 'ok');
}

// ================================================================
//  렌더링
// ================================================================
function render() {
  const tb = document.getElementById('tbody');
  tb.innerHTML = '';

  state.forEach((dist, di) => {
    // 지구 사이 구분선
    if (di > 0) {
      const tr = document.createElement('tr'); tr.className = 'r-dist-sep';
      const td = document.createElement('td'); td.colSpan = 3;
      tr.appendChild(td); tb.appendChild(tr);
    }

    // 지구 헤더
    const chief = dist.samters[0]?.keeper || '-';
    const hdr = document.createElement('tr'); hdr.className = 'r-dh';
    hdr.innerHTML = `
      <td style="width:44px;text-align:center;border-right:2px solid rgba(255,255,255,.28)">샘터</td>
      <td style="width:94px;text-align:center;border-right:2px solid rgba(255,255,255,.28)">청지기</td>
      <td style="text-align:center">
        <input value="${dist.name}"
          style="background:transparent;border:none;color:#fff;font-weight:700;
                 font-size:.8rem;padding:0;font-family:inherit;width:50px;text-align:center"
          oninput="dist.name=this.value;render()">
        <span style="font-size:.72rem;opacity:.9">&nbsp;(지구장:&nbsp;<strong>${chief}</strong>)</span>
      </td>`;
    tb.appendChild(hdr);

    if (!dist.samters.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td'); td.colSpan = 3; td.className = 'empty-d';
      td.textContent = '＋ 샘터 추가 버튼으로 샘터를 추가하세요';
      tr.appendChild(td); tb.appendChild(tr);
      return;
    }

    dist.samters.forEach((samter, si) => {
      // 샘터 사이 구분선
      if (si > 0) {
        const sep = document.createElement('tr'); sep.className = 'r-sep';
        const std = document.createElement('td'); std.colSpan = 3;
        sep.appendChild(std); tb.appendChild(sep);
      }

      const memberCount = samter.rows.flat().filter(Boolean).length;
      const rs = samter.rows.length;

      samter.rows.forEach((row5, ri) => {
        const tr = document.createElement('tr'); tr.className = 'r-s';

        if (ri === 0) {
          // 샘터 번호 칸
          const tn = document.createElement('td'); tn.className = 'cn'; tn.rowSpan = rs;
          tn.innerHTML = `<input value="${samter.num}" placeholder="번호"
            style="width:100%;border:none;background:transparent;text-align:center;
                   font-weight:700;font-size:.85rem;color:var(--navy);padding:4px 2px"
            oninput="samter.num=this.value">`;
          tr.appendChild(tn);

          // 청지기 + 인원수 칸
          const tk = document.createElement('td'); tk.className = 'ck'; tk.rowSpan = rs;
          tk.innerHTML = `
            <input value="${samter.keeper}" placeholder="청지기"
              style="width:100%;border:none;background:transparent;text-align:center;
                     font-size:.74rem;padding:2px;display:block"
              oninput="samter.keeper=this.value;render()" id="kp-${samter.id}">
            <div class="ck-count" id="cc-${samter.id}">(${memberCount}명)</div>`;
          tr.appendChild(tk);
        }

        // 멤버 5칸 그리드
        const tm = document.createElement('td'); tm.className = 'cm';
        const g  = document.createElement('div'); g.className = 'mg'; g.id = `g-${samter.id}-${ri}`;

        row5.forEach((v, ci) => {
          const c   = document.createElement('div'); c.className = 'mc';
          const inp = document.createElement('input');
          inp.value       = v;
          inp.placeholder = (ri * 5 + ci + 1) + '번';

          inp.addEventListener('input', function () {
            row5[ci] = this.value;
            // 인원수만 빠르게 갱신
            const cnt  = samter.rows.flat().filter(Boolean).length;
            const ccEl = document.getElementById('cc-' + samter.id);
            if (ccEl) ccEl.textContent = '(' + cnt + '명)';
            updateStat();
          });

          inp.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (ci < 4) {
              // 같은 행 다음 칸
              g.querySelectorAll('input')[ci + 1]?.focus();
            } else {
              // 5번째 칸 → 다음 행 첫칸 (없으면 새 행 추가)
              const nri = ri + 1;
              if (nri >= samter.rows.length) {
                samter.rows.push(['', '', '', '', '']);
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
      b + sm.rows.flat().filter(Boolean).length, 0), 0);
  document.getElementById('stat').textContent =
    currentYear + '년 · ' + d + '지구 · ' + s + '샘터 · 총 ' + m + '명';
}

// ================================================================
//  엑셀 내보내기
// ================================================================
function doExport() {
  try {
    saveCurrentToAllData();
    const wb   = XLSX.utils.book_new();
    const rows = [['지구', '샘터', '청지기', '조원']];

    state.forEach(d => {
      d.samters.forEach(s => {
        const members = s.rows.flat().filter(Boolean);
        if (!members.length) {
          rows.push([d.name, s.num + '샘터', s.keeper, '']);
        } else {
          members.forEach(m => rows.push([d.name, s.num + '샘터', s.keeper, m]));
        }
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];

    // 헤더 굵게
    for (let c = 0; c < 4; c++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cell]) ws[cell].s = { font: { bold: true } };
    }

    XLSX.utils.book_append_sheet(wb, ws, currentYear + '년 조직표');
    XLSX.writeFile(wb, currentYear + '_시카고언약_샘터조직표.xlsx');
    toast('엑셀 다운로드 완료', 'ok');
  } catch (e) {
    toast(e.message, 'err');
  }
}

// ================================================================
//  유틸
// ================================================================
function toRows(members) {
  const a = members || [];
  const r = [];
  for (let i = 0; i < Math.max(a.length, 1); i += 5)
    r.push([a[i]||'', a[i+1]||'', a[i+2]||'', a[i+3]||'', a[i+4]||'']);
  if (!r.length) r.push(['', '', '', '', '']);
  return r;
}

let _toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = type === 'ok' ? '✓ ' + msg : '✕ ' + msg;
  el.className   = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

// 외부 클릭으로 패널 닫기
document.addEventListener('click', function (e) {
  if (!document.getElementById('yw')?.contains(e.target))  closeYP();
  if (!document.getElementById('dpw')?.contains(e.target)) closeDp();
});

// ESC 키
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeYP(); closeDp(); cancelModal(); }
});
