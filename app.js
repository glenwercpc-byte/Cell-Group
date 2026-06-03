// ================================================================
//  샘터 조직 관리 시스템 — app.js
//  Google Apps Script 웹앱과 통신하는 프론트엔드
// ================================================================

// ★ 아래 URL을 Apps Script 배포 후 발급받은 URL로 교체하세요
const API_URL = 'https://script.google.com/macros/s/AKfycbz0SEKnT5y1FAiOQP15fx3uiEN0fEJps81_tpL331AfkcTrpsN3PcmoY5kaqTMpl2Y5/exec';

// ── 전역 상태 ────────────────────────────────────────────────────
let STATE = {
  sessionToken: null,
  orgData:      null,   // { districts: { '1': { '11': { keeper, members[] } } } }
  roomData:     null,
  inactiveData: null,
  currentTab:   'org',
};

// ================================================================
//  초기화
// ================================================================

window.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('samter_token');
  if (token) {
    STATE.sessionToken = token;
    showApp();
    loadOrg();
  }
});

// ================================================================
//  인증
// ================================================================

async function login() {
  const pw  = document.getElementById('pw').value.trim();
  const err = document.getElementById('login-err');
  if (!pw) { err.textContent = '비밀번호를 입력하세요.'; return; }
  err.textContent = '';

  try {
    const res = await api({ action: 'login', password: pw, user: '관리자' }, false);
    STATE.sessionToken = res.sessionToken;
    sessionStorage.setItem('samter_token', res.sessionToken);
    document.getElementById('pw').value = '';
    showApp();
    loadOrg();
  } catch (e) {
    err.textContent = e.message;
  }
}

async function logout() {
  try { await api({ action: 'logout' }); } catch (_) {}
  sessionStorage.removeItem('samter_token');
  STATE = { sessionToken: null, orgData: null, roomData: null, inactiveData: null, currentTab: 'org' };
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('pw').value = '';
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

// ================================================================
//  API 통신
// ================================================================

async function api(data, useSession = true) {
  if (useSession) data.sessionToken = STATE.sessionToken;
  const res  = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },  // GAS CORS 우회
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || '서버 오류');
  return json.data;
}

// ================================================================
//  탭 전환
// ================================================================

function switchTab(tab) {
  STATE.currentTab = tab;

  // 버튼 active 처리
  document.querySelectorAll('.tab, .m-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // 섹션 표시
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === 'tab-' + tab);
    s.style.display = s.id === 'tab-' + tab ? 'block' : 'none';
  });

  // 탭별 데이터 로드
  if (tab === 'org'      && !STATE.orgData)      loadOrg();
  if (tab === 'room'     && !STATE.roomData)      loadRooms();
  if (tab === 'inactive' && !STATE.inactiveData)  loadInactive();
  if (tab === 'log')     loadLogs();
}

// ================================================================
//  조직표
// ================================================================

async function loadOrg() {
  showSpinner('org-grid');
  try {
    STATE.orgData = await api({ action: 'getOrg' });
    renderOrg();
  } catch (e) { toast(e.message, 'err'); }
}

function renderOrg() {
  const grid       = document.getElementById('org-grid');
  const filterDist = document.getElementById('d-filter').value;
  const query      = document.getElementById('search').value.trim().toLowerCase();
  const data       = STATE.orgData;
  if (!data) return;

  grid.innerHTML = '';

  const districtNames = { '1':'1지구', '2':'2지구', '3':'3지구', '4':'4지구' };

  Object.entries(data.districts).forEach(([d, samters]) => {
    if (filterDist && d !== filterDist) return;

    const block = el('div', 'district-block');
    block.appendChild(el('div', 'district-title', districtNames[d] || d + '지구'));

    const cardsRow = el('div', 'org-grid');
    cardsRow.style.marginBottom = '0';

    Object.entries(samters).forEach(([num, info]) => {
      // 검색 필터
      let matchedMembers = info.members;
      if (query) {
        matchedMembers = info.members.filter(m => m.toLowerCase().includes(query));
        if (!info.keeper.toLowerCase().includes(query) && matchedMembers.length === 0) return;
      }

      cardsRow.appendChild(buildSamterCard(num, info, query));
    });

    if (cardsRow.children.length === 0) return;
    block.appendChild(cardsRow);
    grid.appendChild(block);
  });

  if (!grid.children.length) {
    grid.innerHTML = '<p style="color:var(--ink-light);padding:40px;text-align:center;">검색 결과가 없습니다.</p>';
  }
}

function buildSamterCard(num, info, query = '') {
  const card = el('div', 'samter-card');

  // 카드 헤더
  const head = el('div', 'card-head');
  head.innerHTML = `
    <div>
      <div class="card-title">${num}샘터</div>
      <div class="card-keeper">청지기: ${info.keeper}</div>
    </div>
    <div class="card-actions">
      <button class="card-btn" onclick="openEditKeeper('${num}','${info.keeper}')">청지기 수정</button>
      <button class="card-btn" onclick="openAddMember('${num}')">+ 조원</button>
    </div>
  `;
  card.appendChild(head);

  // 조원 목록
  const list = el('div', 'member-list');

  if (!info.members.length) {
    list.innerHTML = '<p class="no-members">조원이 없습니다.</p>';
  } else {
    info.members.forEach(name => {
      const item = el('div', 'member-item');
      const highlighted = query && name.toLowerCase().includes(query)
        ? `<span class="member-name search-match">${name}</span>`
        : `<span class="member-name">${name}</span>`;
      item.innerHTML = `
        ${highlighted}
        <div class="member-btns">
          <button class="m-btn" onclick="openEditMember('${num}','${name}')">수정</button>
          <button class="m-btn del" onclick="confirmDelMember('${num}','${name}')">삭제</button>
        </div>
      `;
      list.appendChild(item);
    });
  }
  card.appendChild(list);
  return card;
}

// ── 조원 추가 ──────────────────────────────────────────────────
function openAddMember(samter) {
  modalContent(`
    <p class="modal-title">조원 추가 — ${samter}샘터</p>
    <div class="form-group">
      <label>이름 (배우자: 괄호 표기, 예: 홍길동(순이))</label>
      <input id="m-name" type="text" placeholder="이름 입력" autofocus>
    </div>
    <div class="modal-actions">
      <button class="btn-sm" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="doAddMember('${samter}')">추가</button>
    </div>
  `);
  document.getElementById('m-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') doAddMember(samter);
  });
}

async function doAddMember(samter) {
  const name = document.getElementById('m-name').value.trim();
  if (!name) return;
  try {
    await api({ action: 'addMember', samter, name });
    toast(name + ' 추가 완료', 'ok');
    closeModal();
    STATE.orgData = null;
    loadOrg();
  } catch (e) { toast(e.message, 'err'); }
}

// ── 조원 수정 ──────────────────────────────────────────────────
function openEditMember(samter, oldName) {
  modalContent(`
    <p class="modal-title">조원 수정 — ${samter}샘터</p>
    <div class="form-group">
      <label>현재 이름</label>
      <input type="text" value="${oldName}" disabled style="opacity:.6">
    </div>
    <div class="form-group">
      <label>새 이름</label>
      <input id="m-new" type="text" value="${oldName}" autofocus>
    </div>
    <div class="modal-actions">
      <button class="btn-sm" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="doEditMember('${samter}','${oldName}')">수정</button>
    </div>
  `);
  document.getElementById('m-new').addEventListener('keydown', e => {
    if (e.key === 'Enter') doEditMember(samter, oldName);
  });
}

async function doEditMember(samter, oldName) {
  const newName = document.getElementById('m-new').value.trim();
  if (!newName || newName === oldName) { closeModal(); return; }
  try {
    await api({ action: 'editMember', samter, oldName, newName });
    toast(oldName + ' → ' + newName + ' 수정 완료', 'ok');
    closeModal();
    STATE.orgData = null;
    loadOrg();
  } catch (e) { toast(e.message, 'err'); }
}

// ── 조원 삭제 ──────────────────────────────────────────────────
function confirmDelMember(samter, name) {
  modalContent(`
    <p class="modal-title">조원 삭제</p>
    <p style="margin-bottom:20px;color:var(--ink-mid)">
      <strong>${samter}샘터</strong>에서 <strong>${name}</strong>을(를) 삭제할까요?
    </p>
    <div class="modal-actions">
      <button class="btn-sm" onclick="closeModal()">취소</button>
      <button class="btn-danger btn-primary" style="background:var(--red)"
              onclick="doDelMember('${samter}','${name}')">삭제</button>
    </div>
  `);
}

async function doDelMember(samter, name) {
  try {
    await api({ action: 'delMember', samter, name });
    toast(name + ' 삭제 완료', 'ok');
    closeModal();
    STATE.orgData = null;
    loadOrg();
  } catch (e) { toast(e.message, 'err'); }
}

// ── 청지기 수정 ────────────────────────────────────────────────
function openEditKeeper(samter, current) {
  modalContent(`
    <p class="modal-title">청지기 수정 — ${samter}샘터</p>
    <div class="form-group">
      <label>새 청지기 이름</label>
      <input id="k-name" type="text" value="${current}" autofocus>
    </div>
    <div class="modal-actions">
      <button class="btn-sm" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="doEditKeeper('${samter}')">수정</button>
    </div>
  `);
}

async function doEditKeeper(samter) {
  const newKeeper = document.getElementById('k-name').value.trim();
  if (!newKeeper) return;
  try {
    await api({ action: 'editKeeper', samter, newKeeper });
    toast('청지기 수정 완료', 'ok');
    closeModal();
    STATE.orgData = null;
    loadOrg();
  } catch (e) { toast(e.message, 'err'); }
}

// ================================================================
//  방배정
// ================================================================

async function loadRooms() {
  showSpinner('room-body');
  try {
    STATE.roomData = await api({ action: 'getRooms' });
    renderRooms();
  } catch (e) { toast(e.message, 'err'); }
}

function renderRooms() {
  const wrap = document.getElementById('room-body');
  const { rooms } = STATE.roomData;

  let html = `
    <table class="room-table">
      <thead>
        <tr>
          <th>샘터</th>
          <th>청지기</th>
          <th>첫째주</th>
          <th>둘째주</th>
          <th>저장</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.entries(rooms).forEach(([num, r]) => {
    html += `
      <tr>
        <td><strong>${num}샘터</strong></td>
        <td>${r.keeper}</td>
        <td><input class="room-input" id="r${num}_w1" value="${r.week1}" placeholder="방 번호"></td>
        <td><input class="room-input" id="r${num}_w2" value="${r.week2}" placeholder="방 번호"></td>
        <td>
          <button class="btn-sm btn-primary" onclick="saveRoom('${num}')">저장</button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
}

async function saveRoom(samter) {
  const week1 = document.getElementById('r' + samter + '_w1').value.trim();
  const week2 = document.getElementById('r' + samter + '_w2').value.trim();
  try {
    await api({ action: 'updateRoom', samter, week: 'week1', room: week1 });
    await api({ action: 'updateRoom', samter, week: 'week2', room: week2 });
    toast(samter + '샘터 방배정 저장 완료', 'ok');
    STATE.roomData = null;
    loadRooms();
  } catch (e) { toast(e.message, 'err'); }
}

// ================================================================
//  비활동 교인
// ================================================================

async function loadInactive() {
  showSpinner('inactive-body');
  try {
    STATE.inactiveData = await api({ action: 'getInactive' });
    renderInactive();
  } catch (e) { toast(e.message, 'err'); }
}

function renderInactive() {
  const wrap = document.getElementById('inactive-body');
  const { list, tags } = STATE.inactiveData;

  // 전체 비활동 목록
  const allChips = list.map(name => buildChip(name, '', tags[name] || [])).join('');

  // 태그별 분류
  const sections = ['환우', '장결자', '타주'].map(tag => {
    const names = list.filter(n => (tags[n] || []).includes(tag));
    const cls   = tag === '환우' ? 'hwanwoo' : tag === '장결자' ? 'jangyeo' : 'taju';
    const chips = names.map(n => buildChip(n, cls, tags[n] || [])).join('');
    return `
      <div class="inactive-section">
        <div class="inactive-title">${tag} (${names.length}명)</div>
        <div class="inactive-chips">${chips || '<span style="color:var(--ink-light);font-size:.82rem">없음</span>'}</div>
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="inactive-section">
      <div class="inactive-title">전체 비활동 교인 (${list.length}명)</div>
      <div class="inactive-chips">${allChips}</div>
    </div>
    ${sections}
  `;
}

function buildChip(name, cls, tagList) {
  const tagBadges = tagList.map(t =>
    `<span style="font-size:.68rem;color:var(--ink-light)">[${t}]</span>`
  ).join('');
  return `
    <div class="chip ${cls}">
      ${name} ${tagBadges}
      <span class="chip-del" onclick="confirmDelInactive('${name}')">✕</span>
    </div>
  `;
}

function openAddInactive() {
  modalContent(`
    <p class="modal-title">비활동 교인 추가</p>
    <div class="form-group">
      <label>이름</label>
      <input id="i-name" type="text" placeholder="이름 입력" autofocus>
    </div>
    <div class="form-group">
      <label>분류 (선택)</label>
      <select id="i-tag">
        <option value="">선택 안함</option>
        <option value="환우">환우</option>
        <option value="장결자">장결자</option>
        <option value="타주">타주</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-sm" onclick="closeModal()">취소</button>
      <button class="btn-primary" onclick="doAddInactive()">추가</button>
    </div>
  `);
}

async function doAddInactive() {
  const name = document.getElementById('i-name').value.trim();
  const tag  = document.getElementById('i-tag').value;
  if (!name) return;
  try {
    await api({ action: 'addInactive', name, tag });
    toast(name + ' 추가 완료', 'ok');
    closeModal();
    STATE.inactiveData = null;
    loadInactive();
  } catch (e) { toast(e.message, 'err'); }
}

function confirmDelInactive(name) {
  modalContent(`
    <p class="modal-title">비활동 교인 삭제</p>
    <p style="margin-bottom:20px;color:var(--ink-mid)">
      <strong>${name}</strong>을(를) 비활동 목록에서 삭제할까요?
    </p>
    <div class="modal-actions">
      <button class="btn-sm" onclick="closeModal()">취소</button>
      <button class="btn-primary" style="background:var(--red)" onclick="doDelInactive('${name}')">삭제</button>
    </div>
  `);
}

async function doDelInactive(name) {
  try {
    await api({ action: 'delInactive', name });
    toast(name + ' 삭제 완료', 'ok');
    closeModal();
    STATE.inactiveData = null;
    loadInactive();
  } catch (e) { toast(e.message, 'err'); }
}

// ================================================================
//  변경 이력
// ================================================================

async function loadLogs() {
  showSpinner('log-body');
  try {
    const { logs } = await api({ action: 'getLogs' });
    renderLogs(logs);
  } catch (e) { toast(e.message, 'err'); }
}

function renderLogs(logs) {
  const wrap = document.getElementById('log-body');
  if (!logs.length) {
    wrap.innerHTML = '<p style="color:var(--ink-light);padding:40px;text-align:center">변경 이력이 없습니다.</p>';
    return;
  }

  const typeClass = t => {
    if (t.startsWith('ADD'))    return 'ADD';
    if (t.startsWith('EDIT'))   return 'EDIT';
    if (t.startsWith('DEL'))    return 'DELETE';
    if (t === 'KEEPER')         return 'KEEPER';
    if (t.startsWith('ROOM'))   return 'ROOM';
    return '';
  };

  const typeLabel = {
    ADD: '추가', EDIT: '수정', DELETE: '삭제',
    ADD_INACTIVE: '비활동추가', DEL_INACTIVE: '비활동삭제',
    KEEPER: '청지기', ROOM_WEEK1: '방배정(1주)', ROOM_WEEK2: '방배정(2주)',
    LOGIN: '로그인', LOGIN_FAIL: '로그인실패',
  };

  const rows = logs.map(l => `
    <tr>
      <td style="white-space:nowrap;color:var(--ink-light)">${l.date}</td>
      <td>${l.samter !== '-' ? l.samter + '샘터' : '-'}</td>
      <td><span class="log-type ${typeClass(l.type)}">${typeLabel[l.type] || l.type}</span></td>
      <td style="color:var(--ink-mid)">${l.before || '-'}</td>
      <td>${l.after || '-'}</td>
      <td style="color:var(--ink-light)">${l.user}</td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <div class="table-scroll" style="overflow-x:auto">
      <table class="log-table">
        <thead>
          <tr>
            <th>일시</th><th>샘터</th><th>유형</th>
            <th>이전값</th><th>새값</th><th>담당자</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ================================================================
//  엑셀 내보내기 (SheetJS)
// ================================================================

async function doExport() {
  toast('내보내기 준비 중…', 'ok');
  try {
    const data = await api({ action: 'export' });
    const wb   = XLSX.utils.book_new();

    // 시트 추가 함수
    const addSheet = (name, rows) => {
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // 헤더 행 스타일
      const hdrRange = XLSX.utils.decode_range(ws['!ref']);
      for (let c = hdrRange.s.c; c <= hdrRange.e.c; c++) {
        const cell = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[cell]) {
          ws[cell].s = {
            font:    { bold: true, color: { rgb: 'FFFFFF' } },
            fill:    { fgColor: { rgb: '2D6A4F' } },
            alignment: { horizontal: 'center' },
          };
        }
      }

      // 열 너비 자동
      ws['!cols'] = Array(hdrRange.e.c + 1).fill({ wch: 16 });
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet('조직표',   data.org);
    addSheet('방배정',   data.rooms);
    addSheet('비활동교인', data.inactive);
    addSheet('변경이력', data.logs);

    const filename = `샘터조직_${data.exportedAt.replace(/[: ]/g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast('엑셀 파일 다운로드 완료', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

// ================================================================
//  UI 유틸
// ================================================================

function showSpinner(targetId) {
  document.getElementById(targetId).innerHTML =
    '<div class="spinner-wrap"><div class="spinner"></div></div>';
}

function el(tag, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

function modalContent(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
  // 첫 번째 input 자동 포커스
  setTimeout(() => {
    const inp = document.querySelector('#modal-body input:not([disabled])');
    if (inp) inp.focus();
  }, 50);
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

let _toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = type === 'ok' ? '✓ ' + msg : '✕ ' + msg;
  el.className = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
