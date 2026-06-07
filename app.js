// ================================================================
//  시카고 언약 장로교회 샘터 조직표 — app.js  (최종)
//  - 연도별 조직표 관리 (현재 고정 + 새 연도 직접 입력)
//  - 샘터 추가: 번호 입력으로 해당 지구에 자동 삽입
//  - 10번째 칸 Enter → 자동 줄 추가
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
  initData();
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
//  API 통신
// ================================================================
async function apiCall(data) {
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

const SAVE_PASSWORD = '4241';  // 저장 전용 비밀번호

function saveOrg() {
  // 저장 비밀번호 확인 — 고정 오버레이 방식
  let overlay = document.getElementById('save-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'save-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.45);' +
      'display:flex;align-items:center;justify-content:center;z-index:9000;padding:20px';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px 24px 22px;
                width:100%;max-width:320px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
      <div style="font-family:'Nanum Myeongjo',serif;font-size:1rem;color:#1a2744;
                  font-weight:800;margin-bottom:6px">저장 확인</div>
      <div style="font-size:.75rem;color:#888;margin-bottom:16px;line-height:1.5">
        ${currentYear}년 조직표를 저장합니다.<br>저장 비밀번호를 입력하세요.
      </div>
      <input type="password" id="save-pw" placeholder="저장 비밀번호"
        style="width:100%;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;
               font-size:1.1rem;text-align:center;letter-spacing:.25em;outline:none;
               margin-bottom:6px;font-family:inherit;transition:border-color .2s"
        onfocus="this.style.borderColor='#1a2744'"
        onblur="this.style.borderColor='#e0e0e0'"
        onkeydown="if(event.key==='Enter')confirmSave();if(event.key==='Escape')closeSaveOverlay()">
      <div id="save-pw-err"
        style="font-size:.72rem;color:#c0392b;min-height:16px;text-align:center;margin-bottom:12px">
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="closeSaveOverlay()"
          style="flex:1;padding:10px;border-radius:7px;font-size:.82rem;font-weight:600;
                 background:#f0f0f0;color:#555;border:none;cursor:pointer">취소</button>
        <button onclick="confirmSave()"
          style="flex:1;padding:10px;border-radius:7px;font-size:.82rem;font-weight:600;
                 background:#1a2744;color:#fff;border:none;cursor:pointer">저장</button>
      </div>
    </div>`;
  overlay.style.display = 'flex';
  setTimeout(() => document.getElementById('save-pw')?.focus(), 60);
}

function closeSaveOverlay() {
  const overlay = document.getElementById('save-overlay');
  if (overlay) overlay.style.display = 'none';
}

function confirmSave() {
  const pw    = (document.getElementById('save-pw')?.value || '').trim();
  const errEl = document.getElementById('save-pw-err');
  if (pw !== SAVE_PASSWORD) {
    if (errEl) errEl.textContent = '비밀번호가 틀렸습니다.';
    const inp = document.getElementById('save-pw');
    if (inp) { inp.value = ''; inp.focus(); }
    return;
  }
  closeSaveOverlay();
  saveCurrentToAllData();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    toast('저장 완료 ✓', 'ok');
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

  const ns  = { id: nextSid++, num: sNum, keeper: '', rows: [['','','','','','','','','','']] };
  const idx = dist.samters.findIndex(s => parseInt(s.num) > parseInt(sNum));
  if (idx === -1) dist.samters.push(ns); else dist.samters.splice(idx, 0, ns);

  closeDp();
  render();
  toast(sNum + '샘터를 ' + dist.name + '에 추가했습니다', 'ok');
}

// ================================================================
//  렌더링 — 단일 세로 배치, 한 행에 10칸 (10·20번째 Enter → 줄 추가)
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

    const tdNum = document.createElement('td');
    tdNum.style.cssText = 'width:44px;text-align:center;border-right:2px solid rgba(255,255,255,.28)';
    tdNum.textContent = '샘터';
    hdr.appendChild(tdNum);

    const tdKeeper = document.createElement('td');
    tdKeeper.style.cssText = 'width:94px;text-align:center;border-right:2px solid rgba(255,255,255,.28)';
    tdKeeper.textContent = '청지기';
    hdr.appendChild(tdKeeper);

    const tdTitle = document.createElement('td');
    tdTitle.style.textAlign = 'center';

    const nameInp = document.createElement('input');
    nameInp.value = dist.name;
    nameInp.style.cssText =
      'background:transparent;border:none;color:#fff;font-weight:700;' +
      'font-size:.8rem;padding:0;font-family:inherit;width:50px;text-align:center;outline:none';
    nameInp.addEventListener('input', function () { dist.name = this.value; });

    const chiefSpan = document.createElement('span');
    chiefSpan.style.cssText = 'font-size:.72rem;opacity:.9';
    chiefSpan.innerHTML = '&nbsp;(지구장:&nbsp;<strong id="chief-' + dist.id + '">' + chief + '</strong>)';

    tdTitle.appendChild(nameInp);
    tdTitle.appendChild(chiefSpan);

    // X 삭제 버튼 — 샘터가 없을 때만 표시
    if (dist.samters.length === 0) {
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.title = '이 지구 삭제';
      delBtn.style.cssText =
        'margin-left:10px;background:rgba(255,80,80,.25);color:#fff;border:none;' +
        'border-radius:50%;width:20px;height:20px;font-size:.65rem;cursor:pointer;' +
        'line-height:1;padding:0;transition:background .15s;flex-shrink:0';
      delBtn.addEventListener('mouseover', function() { this.style.background='rgba(255,80,80,.5)'; });
      delBtn.addEventListener('mouseout',  function() { this.style.background='rgba(255,80,80,.25)'; });
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx = state.indexOf(dist);
        if (idx !== -1) { state.splice(idx, 1); render(); toast(dist.name + ' 삭제됨', 'ok'); }
      });
      tdTitle.appendChild(delBtn);
    }

    hdr.appendChild(tdTitle);
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

      const memberCount = samter.rows.flat().filter(Boolean).length + (samter.keeper ? 1 : 0);
      const rs = samter.rows.length;

      samter.rows.forEach((row10, ri) => {
        const tr = document.createElement('tr'); tr.className = 'r-s';

        if (ri === 0) {
          // 샘터 번호 칸
          const tn = document.createElement('td'); tn.className = 'cn'; tn.rowSpan = rs;
          const numInp = document.createElement('input');
          numInp.value = samter.num;
          numInp.placeholder = '번호';
          numInp.style.cssText =
            'width:100%;border:none;background:transparent;text-align:center;' +
            'font-weight:700;font-size:.85rem;color:var(--navy);padding:4px 2px;outline:none;font-family:inherit';
          numInp.addEventListener('input', function () { samter.num = this.value; });
          tn.appendChild(numInp);
          tr.appendChild(tn);

          // 청지기 + 인원수 칸
          const tk = document.createElement('td'); tk.className = 'ck'; tk.rowSpan = rs;
          const keeperInp = document.createElement('input');
          keeperInp.value = samter.keeper;
          keeperInp.placeholder = '청지기';
          keeperInp.id = 'kp-' + samter.id;
          keeperInp.style.cssText =
            'width:100%;border:none;background:transparent;text-align:center;' +
            'font-size:.74rem;padding:2px;display:block;outline:none;font-family:inherit';
          keeperInp.addEventListener('input', function () {
            samter.keeper = this.value;
            if (si === 0) {
              const chiefEl = document.getElementById('chief-' + dist.id);
              if (chiefEl) chiefEl.textContent = this.value || '-';
            }
            // 청지기 포함 인원수 갱신
            const cnt  = samter.rows.flat().filter(Boolean).length + (this.value ? 1 : 0);
            const ccEl = document.getElementById('cc-' + samter.id);
            if (ccEl) ccEl.textContent = '(' + cnt + '명)';
          });
          const countDiv = document.createElement('div');
          countDiv.className = 'ck-count';
          countDiv.id = 'cc-' + samter.id;
          countDiv.textContent = '(' + memberCount + '명)';
          tk.appendChild(keeperInp);
          tk.appendChild(countDiv);
          tr.appendChild(tk);
        }

        // 멤버 10칸 그리드
        const tm = document.createElement('td'); tm.className = 'cm';
        const g  = document.createElement('div'); g.className = 'mg'; g.id = `g-${samter.id}-${ri}`;

        row10.forEach((v, ci) => {
          const c   = document.createElement('div'); c.className = 'mc';
          const inp = document.createElement('input');
          inp.value       = v;
          inp.placeholder = (ri * 10 + ci + 1) + '번';

          inp.addEventListener('input', function () {
            row10[ci] = this.value;
            const cnt  = samter.rows.flat().filter(Boolean).length + (samter.keeper ? 1 : 0);
            const ccEl = document.getElementById('cc-' + samter.id);
            if (ccEl) ccEl.textContent = '(' + cnt + '명)';
            updateStat();
          });

          inp.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (ci < 9) {
              // 같은 행 다음 칸
              g.querySelectorAll('input')[ci + 1]?.focus();
            } else {
              // 10번째 칸 → 다음 행 (없으면 새 행 추가)
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
  document.getElementById('stat').textContent =
    currentYear + '년 · ' + d + '지구 · ' + s + '샘터 · 총 ' + m + '명';
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
  if (type === 'xlsx') exportExcel();
}

function exportExcel() {
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
  for (let i = 0; i < Math.max(a.length, 1); i += 10)
    r.push([
      a[i]||'', a[i+1]||'', a[i+2]||'', a[i+3]||'', a[i+4]||'',
      a[i+5]||'', a[i+6]||'', a[i+7]||'', a[i+8]||'', a[i+9]||'',
    ]);
  if (!r.length) r.push(['','','','','','','','','','']);
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
  if (!document.getElementById('yw')?.contains(e.target))   closeYP();
  if (!document.getElementById('dpw')?.contains(e.target))  closeDp();
  if (!document.getElementById('expw')?.contains(e.target)) closeExport();
});

// ESC 키
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeYP(); closeDp(); cancelModal(); closeSaveOverlay(); }
});

// ================================================================
//  자료제공 — 월 샘터보고서 / 년중 샘터출석 상황
//  출석 데이터 저장: attendanceData[year][samterNum][month][memberName] = 'O'|'X'|''
// ================================================================

const ATT_KEY = 'samter_attendance';
let attData = {};   // { '2026': { '22': { '1': { '윤자명': 'O', ... }, ... } } }

// 출석 데이터 로드
function loadAttData() {
  try {
    const s = localStorage.getItem(ATT_KEY);
    if (s) attData = JSON.parse(s);
  } catch(e) {}
}
loadAttData();

function saveAttData() {
  try { localStorage.setItem(ATT_KEY, JSON.stringify(attData)); } catch(e) {}
}

// ── doExport 라우터 확장 ──────────────────────────────────────────
const _origDoExport = doExport;
// 기존 doExport 재정의
window.doExport = function(type) {
  closeExport();
  if (type === 'xlsx')    return exportExcel();
  if (type === 'monthly') return openMonthlyModal();
  if (type === 'yearly')  return openYearlyModal();
};
// 기존 함수도 동일하게
function doExport(type) {
  closeExport();
  if (type === 'xlsx')    return exportExcel();
  if (type === 'monthly') return openMonthlyModal();
  if (type === 'yearly')  return openYearlyModal();
}

// ── 모달 공통 오버레이 ────────────────────────────────────────────
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

// ── 샘터 선택 헬퍼 ───────────────────────────────────────────────
function buildSamterOptions() {
  let opts = '<option value="">-- 샘터 선택 --</option>';
  state.forEach(dist => {
    dist.samters.forEach(s => {
      opts += `<option value="${s.num}">${s.num}샘터 (${s.keeper})</option>`;
    });
  });
  return opts;
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
    if (dist.samters.find(s => s.num === String(samterNum))) {
      return dist.samters[0]?.keeper || '-';
    }
  }
  return '-';
}

function getMemberList(samterNum) {
  const s = getSamterByNum(samterNum);
  if (!s) return [];
  const members = s.rows.flat().filter(Boolean);
  // 청지기를 맨 앞에
  if (s.keeper && !members.includes(s.keeper)) return [s.keeper, ...members];
  return members;
}

// ================================================================
//  월 샘터 보고서
// ================================================================
function openMonthlyModal() {
  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const mOpts  = months.map((m,i) => `<option value="${i+1}">${m}</option>`).join('');
  const samOpts = buildSamterOptions();
  const now = new Date();

  openFullModal(`
    <div style="background:#fff;border-radius:12px;width:100%;max-width:760px;
                padding:28px 24px 24px;position:relative;margin:auto">
      <button onclick="closeFullModal()"
        style="position:absolute;top:14px;right:16px;background:#f0f0f0;border:none;
               border-radius:50%;width:28px;height:28px;font-size:.8rem;cursor:pointer">✕</button>

      <h2 style="font-family:'Nanum Myeongjo',serif;font-size:1.05rem;color:#1a2744;
                 font-weight:800;margin-bottom:16px">📋 월 샘터 보고서</h2>

      <!-- 상단 선택 -->
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <select id="mr-samter" onchange="renderMonthlyForm()"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">
          ${samOpts}
        </select>
        <select id="mr-month" onchange="renderMonthlyForm()"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">
          ${mOpts}
        </select>
        <input id="mr-date" type="text" placeholder="모임일시 (예: 02/08/26)"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;width:130px;font-family:inherit">
        <input id="mr-place" type="text" placeholder="모임장소 (예: 203)"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;width:100px;font-family:inherit">
      </div>

      <div id="monthly-form-body"></div>

      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        <button onclick="saveMonthlyData()"
          style="padding:9px 20px;background:#2d6a4f;color:#fff;border:none;border-radius:7px;
                 font-size:.82rem;font-weight:600;cursor:pointer">💾 저장</button>
        <button onclick="printMonthlyReport()"
          style="padding:9px 20px;background:#1a2744;color:#fff;border:none;border-radius:7px;
                 font-size:.82rem;font-weight:600;cursor:pointer">🖨 인쇄</button>
        <button onclick="closeFullModal()"
          style="padding:9px 16px;background:#f0f0f0;color:#555;border:none;border-radius:7px;
                 font-size:.82rem;cursor:pointer">닫기</button>
      </div>
    </div>`);

  // 현재월 기본 선택
  document.getElementById('mr-month').value = now.getMonth() + 1;
  renderMonthlyForm();
}

function renderMonthlyForm() {
  const samterNum = document.getElementById('mr-samter').value;
  const month     = document.getElementById('mr-month').value;
  const body      = document.getElementById('monthly-form-body');
  if (!samterNum || !body) return;

  const members = getMemberList(samterNum);
  const samter  = getSamterByNum(samterNum);
  if (!members.length) { body.innerHTML = '<p style="color:#888;font-size:.82rem">조원이 없습니다.</p>'; return; }

  // 저장된 출석 데이터 불러오기
  const saved = attData[currentYear]?.[samterNum]?.[month] || {};

  // 출석 인원 계산
  const attCount = members.filter(m => (saved[m] || '') === 'O').length;
  const total    = members.length;

  let rows1 = '', rows2 = '';
  const half = Math.ceil(members.length / 2);
  members.forEach((name, idx) => {
    const val = saved[name] || '';
    const cell = `
      <td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:.78rem">${idx+1}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-size:.78rem;min-width:80px">${name}</td>
      <td style="border:1px solid #ccc;padding:4px;text-align:center">
        <select data-member="${name}" class="att-sel"
          style="border:1px solid #ddd;border-radius:3px;font-size:.75rem;padding:1px 2px;width:44px">
          <option value=""  ${val===''  ?'selected':''}>  </option>
          <option value="O" ${val==='O' ?'selected':''}>O</option>
          <option value="X" ${val==='X' ?'selected':''}>X</option>
        </select>
      </td>
      <td style="border:1px solid #ccc;padding:4px 6px;font-size:.75rem;min-width:80px">
        <input type="text" data-reason="${name}" class="att-reason"
          value="${saved[name+'_reason']||''}" placeholder="결석사유"
          style="border:none;width:100%;font-size:.75rem;font-family:inherit;outline:none">
      </td>`;
    if (idx < half) rows1 += `<tr>${cell}</tr>`;
    else            rows2 += `<tr>${cell}</tr>`;
  });

  body.innerHTML = `
    <div style="border:1.5px solid #1a2744;border-radius:4px;overflow:hidden;margin-bottom:10px">
      <!-- 헤더 정보 -->
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
          <td id="att-rate-cell" style="padding:6px 10px;border:1px solid #b8c8e0;font-weight:700;color:#3a5a8c">${total>0?Math.round(attCount/total*100):0}%</td>
        </tr>
      </table>
      <!-- 명단 2열 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#3a5a8c;color:#fff;font-size:.73rem">
            <th style="padding:5px;border:1px solid rgba(255,255,255,.2);width:28px">번호</th>
            <th style="padding:5px;border:1px solid rgba(255,255,255,.2)">성명</th>
            <th style="padding:5px;border:1px solid rgba(255,255,255,.2);width:48px">출/결</th>
            <th style="padding:5px;border:1px solid rgba(255,255,255,.2)">결석사유</th>
          </tr></thead>
          <tbody>${rows1}</tbody>
        </table>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#3a5a8c;color:#fff;font-size:.73rem">
            <th style="padding:5px;border:1px solid rgba(255,255,255,.2);width:28px">번호</th>
            <th style="padding:5px;border:1px solid rgba(255,255,255,.2)">성명</th>
            <th style="padding:5px;border:1px solid rgba(255,255,255,.2);width:48px">출/결</th>
            <th style="padding:5px;border:1px solid rgba(255,255,255,.2)">결석사유</th>
          </tr></thead>
          <tbody>${rows2}</tbody>
        </table>
      </div>
      <!-- 새교우 / 보고 / 건의 -->
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="border:1px solid #ccc;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600;width:70px">새교우</td>
            <td style="border:1px solid #ccc;padding:5px 8px;font-size:.75rem" colspan="3">
              <input id="mr-new" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="${saved['_new']||''}"></td></tr>
        <tr><td style="border:1px solid #ccc;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600">보고사항</td>
            <td style="border:1px solid #ccc;padding:5px 8px;font-size:.75rem" colspan="3">
              <input id="mr-report" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="${saved['_report']||''}"></td></tr>
        <tr><td style="border:1px solid #ccc;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600">건의사항</td>
            <td style="border:1px solid #ccc;padding:5px 8px;font-size:.75rem" colspan="3">
              <input id="mr-suggest" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="${saved['_suggest']||''}"></td></tr>
      </table>
    </div>`;

  // 출석 변경 시 카운트 + 출석률 업데이트
  body.querySelectorAll('.att-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      const cnt  = [...body.querySelectorAll('.att-sel')].filter(s => s.value === 'O').length;
      const tot  = body.querySelectorAll('.att-sel').length;
      const rate = tot > 0 ? Math.round(cnt / tot * 100) : 0;
      const cEl  = document.getElementById('att-count-cell');
      const rEl  = document.getElementById('att-rate-cell');
      if (cEl) cEl.textContent = cnt + '명';
      if (rEl) rEl.textContent = rate + '%';
    });
  });
}

function saveMonthlyData() {
  const samterNum = document.getElementById('mr-samter')?.value;
  const month     = document.getElementById('mr-month')?.value;
  if (!samterNum || !month) { toast('샘터와 월을 선택하세요', 'err'); return; }

  if (!attData[currentYear]) attData[currentYear] = {};
  if (!attData[currentYear][samterNum]) attData[currentYear][samterNum] = {};
  const rec = {};

  document.querySelectorAll('.att-sel').forEach(sel => {
    rec[sel.dataset.member] = sel.value;
  });
  document.querySelectorAll('.att-reason').forEach(inp => {
    if (inp.value) rec[inp.dataset.reason + '_reason'] = inp.value;
  });
  rec['_new']     = document.getElementById('mr-new')?.value || '';
  rec['_report']  = document.getElementById('mr-report')?.value || '';
  rec['_suggest'] = document.getElementById('mr-suggest')?.value || '';

  attData[currentYear][samterNum][month] = rec;
  saveAttData();
  toast(samterNum + '샘터 ' + month + '월 보고서 저장 완료', 'ok');
  renderMonthlyForm(); // 카운트 갱신
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
    <style>
      body{font-family:'Noto Sans KR',sans-serif;padding:20px;font-size:12px}
      h2{font-family:'Nanum Myeongjo',serif;color:#1a2744;margin-bottom:10px}
      table{width:100%;border-collapse:collapse}
      td,th{border:1px solid #aaa;padding:4px 6px}
      select,input{font-size:11px}
      @media print{button{display:none}}
    </style>
    </head><body>
    <h2>2026년 시카고 언약장로교회 말씀의 샘터부 보고서</h2>
    <p style="font-size:11px;color:#888;margin-bottom:8px">
      모임일시: ${date || '　　'} &nbsp; 모임장소: ${place || '　　'}
    </p>
    ${body.innerHTML}
    <p style="font-size:10px;color:#888;margin-top:12px">
      보고서 제출은 본당 예배실 Lobby 책장위에 있는 각 지구함에 넣어 주세요.
    </p>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  win.document.close();
}

// ================================================================
//  년중 샘터 출석 상황
// ================================================================
function openYearlyModal() {
  const samOpts = buildSamterOptions();
  const months  = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  openFullModal(`
    <div style="background:#fff;border-radius:12px;width:100%;max-width:900px;
                padding:28px 24px 24px;position:relative;margin:auto">
      <button onclick="closeFullModal()"
        style="position:absolute;top:14px;right:16px;background:#f0f0f0;border:none;
               border-radius:50%;width:28px;height:28px;font-size:.8rem;cursor:pointer">✕</button>

      <h2 style="font-family:'Nanum Myeongjo',serif;font-size:1.05rem;color:#1a2744;
                 font-weight:800;margin-bottom:16px">📅 년중 샘터 출석 상황 (${currentYear}년)</h2>

      <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;flex-wrap:wrap">
        <select id="yr-samter" onchange="renderYearlyTable()"
          style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">
          ${samOpts}
        </select>
        <button onclick="printYearlyReport()"
          style="padding:8px 18px;background:#1a2744;color:#fff;border:none;border-radius:6px;
                 font-size:.8rem;font-weight:600;cursor:pointer">🖨 인쇄</button>
        <button onclick="closeFullModal()"
          style="padding:8px 14px;background:#f0f0f0;color:#555;border:none;border-radius:6px;
                 font-size:.8rem;cursor:pointer">닫기</button>
      </div>

      <div id="yearly-table-body" style="overflow-x:auto"></div>
    </div>`);

  renderYearlyTable();
}

function renderYearlyTable() {
  const samterNum = document.getElementById('yr-samter')?.value;
  const body      = document.getElementById('yearly-table-body');
  if (!samterNum || !body) return;

  const members = getMemberList(samterNum);
  const samter  = getSamterByNum(samterNum);
  const months  = [1,2,3,4,5,6,7,8,9,10,11,12];
  const mLabels = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  // 헤더
  let html = `
    <table style="width:100%;border-collapse:collapse;font-size:.75rem;min-width:700px">
      <thead>
        <tr style="background:#1a2744;color:#fff">
          <th style="padding:7px 8px;border:1px solid rgba(255,255,255,.2);text-align:left;min-width:30px">번호</th>
          <th style="padding:7px 8px;border:1px solid rgba(255,255,255,.2);text-align:left;min-width:90px">성명</th>`;
  months.forEach((m, i) => {
    html += `<th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:40px">${mLabels[i]}</th>`;
  });
  html += `<th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:44px">출석수</th>
           <th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:44px">출석률</th>
        </tr>
      </thead><tbody>`;

  // 데이터 행 — 월별 미보고면 빈칸, 결석 X, 출석 O
  members.forEach((name, idx) => {
    let attCount = 0, reportedMonths = 0;
    let cells = '';
    months.forEach(m => {
      const rec = attData[currentYear]?.[samterNum]?.[m];
      if (!rec) { cells += `<td style="border:1px solid #ddd;text-align:center;color:#ccc">-</td>`; return; }
      reportedMonths++;
      const v = rec[name] || '';
      if (v === 'O') attCount++;
      const color = v==='O'?'#2d6a4f':v==='X'?'#c0392b':'#888';
      cells += `<td style="border:1px solid #ddd;text-align:center;color:${color};font-weight:${v?'700':'400'}">${v||'·'}</td>`;
    });
    const rate = reportedMonths > 0 ? Math.round(attCount / reportedMonths * 100) : 0;
    const rateColor = rate >= 80 ? '#2d6a4f' : rate >= 50 ? '#856404' : '#c0392b';
    html += `<tr style="background:${idx%2===0?'#fff':'#f9fafc'}">
      <td style="border:1px solid #ddd;padding:5px 6px;text-align:center">${idx+1}</td>
      <td style="border:1px solid #ddd;padding:5px 8px">${name}</td>
      ${cells}
      <td style="border:1px solid #ddd;padding:5px 4px;text-align:center;font-weight:700;color:#1a2744">${attCount}</td>
      <td style="border:1px solid #ddd;padding:5px 4px;text-align:center;font-weight:700;color:${rateColor}">${reportedMonths?rate+'%':'-'}</td>
    </tr>`;
  });

  // 월별 참석 합계 행
  html += `<tr style="background:#e8edf7;font-weight:700">
    <td style="border:1px solid #ddd;padding:5px 6px;text-align:center" colspan="2">월별 참석수</td>`;
  months.forEach(m => {
    const rec = attData[currentYear]?.[samterNum]?.[m];
    if (!rec) { html += `<td style="border:1px solid #ddd;text-align:center;color:#bbb">-</td>`; return; }
    const cnt = members.filter(n => rec[n] === 'O').length;
    html += `<td style="border:1px solid #ddd;text-align:center;color:#1a2744">${cnt}</td>`;
  });
  html += `<td style="border:1px solid #ddd" colspan="2"></td></tr>`;
  html += '</tbody></table>';

  body.innerHTML = html;
}

function printYearlyReport() {
  const samterNum = document.getElementById('yr-samter')?.value;
  const body      = document.getElementById('yearly-table-body');
  if (!body) return;
  const samter = getSamterByNum(samterNum);

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <title>${samterNum}샘터 년중 출석상황</title>
    <style>
      body{font-family:'Noto Sans KR',sans-serif;padding:16px;font-size:11px}
      h2{font-family:'Nanum Myeongjo',serif;color:#1a2744;margin-bottom:8px;font-size:14px}
      table{width:100%;border-collapse:collapse}
      td,th{border:1px solid #aaa;padding:3px 5px}
      @media print{button{display:none}}
    </style></head><body>
    <h2>${currentYear}년 시카고 언약장로교회 ${samterNum}샘터 년중 출석 상황</h2>
    <p style="font-size:10px;color:#888;margin-bottom:8px">청지기: ${samter?.keeper||''}</p>
    ${body.innerHTML}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  win.document.close();
}
