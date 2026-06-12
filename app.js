// 시카고 언약 장로교회 샘터 조직표 v4
const API_URL='https://script.google.com/macros/s/AKfycbyTh4Bhr0yqbOo8VIkSZC561pRXiMfaI3CS9csdYOD7fsY5X3Irb_bGcMxXG36pwC8_GA/exec';
const ATT_KEY='samter_att';
let allData={},currentYear='2026',state=[],attData={};
let nextSid=500,pendingYear=null,selMode=null;
const dirtySet=new Set();
const BASE_2026=[];  // 샘플 데이터 제거 — Sheets에서 로드

window.addEventListener('DOMContentLoaded',async()=>{
  try{const a=localStorage.getItem(ATT_KEY);if(a)attData=JSON.parse(a);}catch(e){}

  // 로딩 표시
  const tb=document.getElementById('tbody');
  if(tb){
    tb.innerHTML='<tr><td colspan="3" style="padding:30px;text-align:center;color:#888;font-size:.9rem">⏳ Google Sheets에서 데이터를 불러오는 중...</td></tr>';
  }

  try{
    const res=await apiCall({action:'getOrg',year:'2026'});
    if(res&&res.districts&&Object.keys(res.districts).length>0){
      const c=cvtOrg(res.districts);
      if(c.length>0&&c.some(d=>d.samters.length>0)){
        allData['2026']=c;
        loadYear('2026');
        toast('데이터 로드 완료 ✓','ok');
      } else {
        loadYear('2026');
        toast('Sheets에 데이터가 없습니다. 샘터를 추가해 주세요.','ok');
      }
    } else {
      loadYear('2026');
      toast('Sheets에 데이터가 없습니다. 샘터를 추가해 주세요.','ok');
    }
  }catch(e){
    allData['2026']=BASE_2026;
    loadYear('2026');
    toast('Sheets 연결 실패: '+e.message,'err');
  }
});

function apiCall(data){
  return new Promise((resolve,reject)=>{
    const cb='__cb'+Date.now()+'_'+Math.floor(Math.random()*9999);
    const timer=setTimeout(()=>{delete window[cb];document.getElementById(cb)?.remove();reject(new Error('시간 초과'));},15000);
    window[cb]=function(json){clearTimeout(timer);delete window[cb];document.getElementById(cb)?.remove();if(!json.ok){reject(new Error(json.error||'오류'));return;}resolve(json.data);};
    const s=document.createElement('script');s.id=cb;s.src=API_URL+'?callback='+cb+'&payload='+encodeURIComponent(JSON.stringify(data));
    s.onerror=()=>{clearTimeout(timer);delete window[cb];s.remove();reject(new Error('네트워크 오류'));};
    document.head.appendChild(s);
  });
}
function cvtOrg(districts){const r=[];Object.entries(districts).forEach(([n,d])=>{const sl=(d.samters||[]).map(s=>({num:s.num,keeper:s.keeper||'',members:(s.members||[]).filter(Boolean)}));if(sl.length>0)r.push({name:n,samters:sl});});r.sort((a,b)=>a.name.localeCompare(b.name,'ko'));return r;}

function loadYear(y){
  currentYear=y;document.getElementById('yd').textContent=y;
  const raw=allData[y]||[];
  state=raw.map((d,di)=>({id:di+1,name:d.name,samters:d.samters.map((s,si)=>({id:(di+1)*100+si+1,num:s.num,keeper:s.keeper,rows:toRows(s.members)}))}));
  dirtySet.clear();render();
}
function saveCurrentToAllData(){allData[currentYear]=state.map(d=>({name:d.name,samters:d.samters.map(s=>({num:s.num,keeper:s.keeper,members:s.rows.flat().filter(Boolean)}))}));}
function toRows(members){const a=members||[],r=[];for(let i=0;i<Math.max(a.length,1);i+=10)r.push([a[i]||'',a[i+1]||'',a[i+2]||'',a[i+3]||'',a[i+4]||'',a[i+5]||'',a[i+6]||'',a[i+7]||'',a[i+8]||'',a[i+9]||'']);if(!r.length)r.push(['','','','','','','','','','']);return r;}
function toggleYP(){const p=document.getElementById('yp'),opening=p.classList.contains('hidden');p.classList.toggle('hidden');if(opening){document.getElementById('yp-cur-num').textContent=currentYear;const others=Object.keys(allData).filter(y=>y!==currentYear).sort((a,b)=>b-a);const se=document.getElementById('yp-saved'),le=document.getElementById('yp-saved-list');if(!others.length){se.classList.add('hidden');}else{se.classList.remove('hidden');le.innerHTML='';others.forEach(y=>{const d=document.createElement('div');d.className='yp-saved-item';d.innerHTML='<span class="yn">'+y+'년</span><span class="yb-saved">저장됨</span>';d.onclick=()=>selectYear(String(y));le.appendChild(d);});}document.getElementById('new-year-inp').value='';document.getElementById('yp-err').textContent='';setTimeout(()=>document.getElementById('new-year-inp').focus(),60);}}
function closeYP(){document.getElementById('yp').classList.add('hidden');}
function submitNewYear(){const val=document.getElementById('new-year-inp').value.trim(),y=parseInt(val),err=document.getElementById('yp-err');if(!val||isNaN(y)||y<2024||y>2099){err.textContent='2024~2099 사이로 입력하세요.';return;}if(String(y)===currentYear){err.textContent='현재 연도입니다.';return;}err.textContent='';selectYear(String(y));}
function selectYear(y){closeYP();if(y===currentYear)return;saveCurrentToAllData();if(allData[y]){loadYear(y);return;}pendingYear=y;selMode=null;document.getElementById('modal-area').innerHTML=`<div class="modal-bd"><div class="modal-box"><div class="modal-title">${y}년 조직표 만들기</div><div class="modal-sub">${currentYear}년 조직표를 기반으로 ${y}년을 시작합니다.</div><div class="modal-opts"><button class="modal-opt" id="opt-copy" onclick="pickMode('copy')"><div class="opt-t">1. 현재 인원 그대로 사용</div><div class="opt-d">${currentYear}년 명단을 복사합니다.</div></button><button class="modal-opt" id="opt-fresh" onclick="pickMode('fresh')"><div class="opt-t">2. 전면 재조정</div><div class="opt-d">구조만 유지하고 조원 명단을 비웁니다.</div></button></div><div class="modal-btns"><button class="mb-cancel" onclick="cancelModal()">취소</button><button class="mb-ok" id="mok" onclick="confirmModal()" disabled>확인</button></div></div></div>`;}
function pickMode(m){selMode=m;document.querySelectorAll('.modal-opt').forEach(b=>b.classList.remove('sel'));document.getElementById('opt-'+m).classList.add('sel');document.getElementById('mok').disabled=false;}
function cancelModal(){document.getElementById('modal-area').innerHTML='';pendingYear=null;selMode=null;}
function confirmModal(){if(!selMode||!pendingYear)return;const y=pendingYear,prev=allData[currentYear]||[];allData[y]=selMode==='copy'?JSON.parse(JSON.stringify(prev)):prev.map(d=>({name:d.name,samters:d.samters.map(s=>({num:s.num,keeper:'',members:[]}))}));document.getElementById('modal-area').innerHTML='';pendingYear=null;selMode=null;loadYear(y);toast(y+'년 조직표를 시작합니다','ok');}

function saveOrg(){saveCurrentToAllData();syncAllToSheets();}
function markDirty(n){dirtySet.add(String(n));}
async function syncAllToSheets(){
  const targets=[];state.forEach(dist=>dist.samters.forEach(s=>{if(dirtySet.size===0||dirtySet.has(String(s.num)))targets.push({dist,samter:s});}));
  if(!targets.length){toast('변경 내용 없음','ok');return;}
  toast('저장 중… (0/'+targets.length+')','ok');let done=0,fail=0;
  for(const{dist,samter}of targets){
    try{await apiCall({action:'saveSamter',year:currentYear,samter:samter.num,district:dist.name,keeper:samter.keeper,members:samter.rows.flat().filter(Boolean)});done++;toast('저장 중… ('+done+'/'+targets.length+')','ok');}
    catch(e){fail++;toast(samter.num+'샘터 오류: '+e.message,'err');}
    await new Promise(r=>setTimeout(r,300));
  }
  dirtySet.clear();toast(fail===0?'저장 완료 ('+done+'샘터) ✓':'완료 '+done+' / 실패 '+fail,fail?'err':'ok');
}

function addDistrict(){const n=state.length+1;state.push({id:Date.now(),name:n+'지구',samters:[]});render();toast(n+'지구 추가됨','ok');}
function toggleDp(){const b=document.getElementById('dpb');b.classList.toggle('hidden');if(!b.classList.contains('hidden')){document.getElementById('si').value='';document.getElementById('dp-err').textContent='';setTimeout(()=>document.getElementById('si').focus(),40);}}
function closeDp(){document.getElementById('dpb').classList.add('hidden');}
function doAddSamter(){const val=document.getElementById('si').value.trim(),err=document.getElementById('dp-err');if(!val||isNaN(Number(val))){err.textContent='숫자를 입력하세요 (예: 14)';return;}const sNum=val,dNum=parseInt(val[0]),dist=state.find(d=>d.name===dNum+'지구');if(!dist){err.textContent=dNum+'지구가 없습니다.';return;}if(dist.samters.find(s=>s.num===sNum)){err.textContent=sNum+'샘터가 이미 있습니다.';return;}const ns={id:nextSid++,num:sNum,keeper:'',rows:[['','','','','','','','','','']]};const idx=dist.samters.findIndex(s=>parseInt(s.num)>parseInt(sNum));if(idx===-1)dist.samters.push(ns);else dist.samters.splice(idx,0,ns);closeDp();render();toast(sNum+'샘터 추가됨','ok');}

function render(){
  const tb=document.getElementById('tbody');if(!tb)return;tb.innerHTML='';
  state.forEach((dist,di)=>{
    if(di>0){const tr=document.createElement('tr');tr.className='r-dist-sep';const td=document.createElement('td');td.colSpan=3;tr.appendChild(td);tb.appendChild(tr);}
    const chief=dist.samters[0]?.keeper||'-';
    const hdr=document.createElement('tr');hdr.className='r-dh';
    const tn=document.createElement('td');tn.style.cssText='width:44px;text-align:center;border-right:2px solid rgba(255,255,255,.28)';tn.textContent='샘터';hdr.appendChild(tn);
    const tk=document.createElement('td');tk.style.cssText='width:100px;text-align:center;border-right:2px solid rgba(255,255,255,.28)';tk.textContent='청지기';hdr.appendChild(tk);
    const tt=document.createElement('td');tt.style.cssText='text-align:center;padding:0 12px';
    const ni=document.createElement('input');ni.value=dist.name;ni.style.cssText='background:transparent;border:none;color:#fff;font-weight:700;font-size:.82rem;padding:0;font-family:inherit;width:46px;text-align:center;outline:none';ni.addEventListener('input',()=>{dist.name=ni.value;});tt.appendChild(ni);
    const cs=document.createElement('span');cs.style.cssText='font-size:.78rem;color:rgba(255,255,255,.9)';cs.innerHTML='&nbsp;(지구장:&nbsp;<strong id="chief-'+dist.id+'">'+chief+'</strong>)';tt.appendChild(cs);
    if(!dist.samters.length){const del=document.createElement('button');del.textContent='✕';del.style.cssText='margin-left:10px;background:rgba(255,80,80,.25);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:.65rem;cursor:pointer';del.onclick=e=>{e.stopPropagation();state.splice(state.indexOf(dist),1);render();toast(dist.name+' 삭제됨','ok');};tt.appendChild(del);}
    hdr.appendChild(tt);tb.appendChild(hdr);
    if(!dist.samters.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=3;td.className='empty-d';td.textContent='＋ 샘터 추가 버튼으로 샘터를 추가하세요';tr.appendChild(td);tb.appendChild(tr);return;}
    dist.samters.forEach((samter,si)=>{
      if(si>0){const sep=document.createElement('tr');sep.className='r-sep';const sd=document.createElement('td');sd.colSpan=3;sep.appendChild(sd);tb.appendChild(sep);}
      const cnt=samter.rows.flat().filter(Boolean).length+(samter.keeper?1:0),rs=samter.rows.length;
      samter.rows.forEach((row,ri)=>{
        const tr=document.createElement('tr');tr.className='r-s';
        if(ri===0){
          const nTd=document.createElement('td');nTd.className='cn';nTd.rowSpan=rs;const nI=document.createElement('input');nI.value=samter.num;nI.placeholder='번호';nI.style.cssText='width:100%;border:none;background:transparent;text-align:center;font-weight:700;font-size:.85rem;color:var(--navy);padding:4px 2px;outline:none;font-family:inherit';nI.addEventListener('input',()=>{samter.num=nI.value;markDirty(nI.value);});nTd.appendChild(nI);tr.appendChild(nTd);
          const kTd=document.createElement('td');kTd.className='ck';kTd.rowSpan=rs;const kI=document.createElement('input');kI.value=samter.keeper;kI.placeholder='청지기';kI.id='kp-'+samter.id;kI.style.cssText='width:100%;border:none;background:transparent;text-align:center;font-size:.76rem;padding:2px;display:block;outline:none;font-family:inherit';
          kI.addEventListener('input',()=>{samter.keeper=kI.value;if(si===0){const el=document.getElementById('chief-'+dist.id);if(el)el.textContent=kI.value||'-';}const c2=samter.rows.flat().filter(Boolean).length+(kI.value?1:0);const cc=document.getElementById('cc-'+samter.id);if(cc)cc.textContent='('+c2+'명)';markDirty(samter.num);});
          const cc=document.createElement('div');cc.className='ck-count';cc.id='cc-'+samter.id;cc.textContent='('+cnt+'명)';kTd.appendChild(kI);kTd.appendChild(cc);tr.appendChild(kTd);
        }
        const cmTd=document.createElement('td');cmTd.className='cm';const g=document.createElement('div');g.className='mg';g.id='g-'+samter.id+'-'+ri;
        row.forEach((v,ci)=>{
          const mc=document.createElement('div');mc.className='mc';const inp=document.createElement('input');inp.value=v;inp.placeholder=(ri*10+ci+1)+'번';
          inp.addEventListener('input',()=>{row[ci]=inp.value;const c2=samter.rows.flat().filter(Boolean).length+(samter.keeper?1:0);const cc=document.getElementById('cc-'+samter.id);if(cc)cc.textContent='('+c2+'명)';updateStat();markDirty(samter.num);});
          inp.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();if(ci<9){g.querySelectorAll('input')[ci+1]?.focus();}else{const nri=ri+1;if(nri>=samter.rows.length){samter.rows.push(['','','','','','','','','','']);render();setTimeout(()=>document.getElementById('g-'+samter.id+'-'+nri)?.querySelectorAll('input')[0]?.focus(),20);}else{document.getElementById('g-'+samter.id+'-'+nri)?.querySelectorAll('input')[0]?.focus();}}});
          mc.appendChild(inp);g.appendChild(mc);
        });
        cmTd.appendChild(g);tr.appendChild(cmTd);tb.appendChild(tr);
      });
    });
  });
  updateStat();
}
function updateStat(){const d=state.length,s=state.reduce((a,ds)=>a+ds.samters.length,0),m=state.reduce((a,ds)=>a+ds.samters.reduce((b,sm)=>b+sm.rows.flat().filter(Boolean).length+(sm.keeper?1:0),0),0);const el=document.getElementById('stat');if(el)el.textContent=currentYear+'년 · '+d+'지구 · '+s+'샘터 · 총 '+m+'명';}

function getSamterByNum(n){for(const d of state){const s=d.samters.find(s=>s.num===String(n));if(s)return s;}return null;}
function getDistrictChief(n){for(const d of state){if(d.samters.find(s=>s.num===String(n)))return d.samters[0]?.keeper||'-';}return '-';}
function getMemberList(n){const s=getSamterByNum(n);if(!s)return[];const m=s.rows.flat().filter(Boolean);return(s.keeper&&!m.includes(s.keeper))?[s.keeper,...m]:m;}
function buildSamterOptions(){return'<option value="">-- 샘터 선택 --</option>'+state.flatMap(d=>d.samters.map(s=>'<option value="'+s.num+'">'+s.num+'샘터 ('+s.keeper+')</option>')).join('');}

function toggleExport(){document.getElementById('expb').classList.toggle('hidden');}
function closeExport(){const b=document.getElementById('expb');if(b)b.classList.add('hidden');}
function doExport(t){closeExport();if(t==='gdocs')exportToGoogleDocs();if(t==='monthly')openMonthlyModal();if(t==='yearly')openYearlyModal();}

function exportToGoogleDocs(){
  saveCurrentToAllData();
  const total=state.reduce((a,d)=>a+d.samters.reduce((b,s)=>b+s.rows.flat().filter(Boolean).length+(s.keeper?1:0),0),0);
  const totalS=state.reduce((a,d)=>a+d.samters.length,0);
  let rows='';
  state.forEach((dist,di)=>{
    const chief=dist.samters[0]?.keeper||'-';
    rows+='<tr><td style="background:#3a5a8c;color:#fff;font-weight:700;font-size:12px;padding:5px 6px;border:1px solid #2a4a7c;white-space:nowrap;text-align:center">샘터</td><td style="background:#3a5a8c;color:#fff;font-weight:700;font-size:12px;padding:5px 6px;border:1px solid #2a4a7c;white-space:nowrap;text-align:center">청지기</td><td colspan="10" style="background:#3a5a8c;color:#fff;font-weight:700;font-size:12px;padding:5px 10px;border:1px solid #2a4a7c;white-space:nowrap;text-align:center">'+dist.name+'&nbsp;&nbsp;(지구장: '+chief+')</td></tr>';
    dist.samters.forEach(s=>{
      const members=s.rows.flat().filter(Boolean),cnt=members.length+(s.keeper?1:0),rCount=Math.ceil(Math.max(members.length,1)/10);
      for(let r=0;r<Math.max(members.length,1);r+=10){
        const chunk=members.slice(r,r+10);while(chunk.length<10)chunk.push('');
        rows+='<tr>';
        if(r===0){rows+='<td rowspan="'+rCount+'" style="border:1px solid #bbb;padding:3px 5px;text-align:center;font-weight:700;font-size:12px;background:#e8eef7;vertical-align:middle;white-space:nowrap">'+s.num+'</td><td rowspan="'+rCount+'" style="border:1px solid #bbb;padding:3px 6px;text-align:center;font-size:11px;background:#f2f5fa;vertical-align:middle;white-space:nowrap">'+s.keeper+'<br><span style="color:#3a5a8c;font-size:10px">('+cnt+'명)</span></td>';}
        chunk.forEach(n=>{rows+='<td style="border:1px solid #ddd;padding:3px 4px;font-size:11px;white-space:nowrap;width:7%">'+(n||'&nbsp;')+'</td>';});
        rows+='</tr>';
      }
      rows+='<tr><td colspan="12" style="height:2px;background:#d0daea;border:none;padding:0"></td></tr>';
    });
    if(di<state.length-1)rows+='<tr><td colspan="12" style="height:5px;background:#ece8e0;border:none;padding:0"></td></tr>';
  });
  const html='<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>시카고 언약 장로교회 '+currentYear+'년 샘터 조직표</title>'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'body{font-family:"Noto Sans KR","Malgun Gothic",sans-serif;padding:8px 10px;font-size:10px;color:#111}'
    +'h1{font-family:"Nanum Myeongjo",serif;font-size:14px;color:#1a2744;text-align:center;font-weight:800;margin-bottom:1px}'
    +'.sub{text-align:center;font-size:9.5px;color:#666;margin-bottom:6px}'
    +'table{border-collapse:collapse;width:100%;table-layout:fixed}'
    +'td{word-break:keep-all;font-size:10px}'
    +'.btn{display:inline-block;margin:0 5px 0 0;padding:5px 14px;background:#1a2744;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;font-family:inherit}'
    +'@media print{'
    +'.no-print{display:none!important}'
    +'body{padding:4px 6px;font-size:9px}'
    +'td{font-size:9px!important}'
    +'@page{size:legal portrait;margin:6mm}'
    +'}'
    +'</style>'
    +'</head><body>'
    +'<h1>시카고 언약 장로교회 '+currentYear+'년 샘터 조직표</h1>'
    +'<p class="sub">'+state.length+'지구 &middot; '+totalS+'샘터 &middot; 총 '+total+'명</p>'
    +'<div class="no-print" style="margin-bottom:8px">'
    +'<button class="btn" onclick="window.print()">🖨 인쇄</button>'
    +'<button class="btn" style="background:#c0392b" onclick="showPdfGuide()">📄 PDF 저장</button>'
    +'</div>'
    +'<div id="pdf-guide" class="no-print" style="display:none;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:12px 16px;margin-bottom:10px;font-size:12px;line-height:1.8;color:#333">'
    +'<strong>📄 PDF 저장 방법</strong><br>'
    +'1. 아래 <strong>[인쇄]</strong> 버튼 클릭<br>'
    +'2. 프린터 선택에서 <strong>"Microsoft Print to PDF"</strong> 또는 <strong>"Save as PDF"</strong> 선택<br>'
    +'3. 파일명 입력 후 저장<br>'
    +'<button onclick="document.getElementById('pdf-guide').style.display='none'" style="margin-top:8px;padding:4px 12px;background:#666;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">닫기</button>'
    +'&nbsp;<button onclick="window.print()" style="margin-top:8px;padding:4px 12px;background:#1a2744;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">바로 인쇄/PDF 저장</button>'
    +'</div>'
    +'<div id="tw"><table><tbody>'+rows+'</tbody></table></div>'
    +'<script>'
    +'function showPdfGuide(){'
    +'  var g=document.getElementById("pdf-guide");'
    +'  g.style.display=g.style.display==="none"?"block":"none";'
    +'}'
    +'<\/script>'
    +'</body></html>';
  const w=window.open('','_blank');if(!w){toast('팝업 차단됨','err');return;}
  w.document.write(html);w.document.close();toast('조직표 출력 창이 열렸습니다','ok');
}

function openMonthlyModal(){
  const mOpts=[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>'<option value="'+m+'">'+m+'월</option>').join('');
  openFullModal('<div style="background:#fff;border-radius:12px;width:100%;max-width:780px;padding:28px 24px 24px;position:relative;margin:auto"><button onclick="closeFullModal()" style="position:absolute;top:14px;right:16px;background:#f0f0f0;border:none;border-radius:50%;width:28px;height:28px;font-size:.8rem;cursor:pointer">✕</button><h2 style="font-family:\'Nanum Myeongjo\',serif;font-size:1.05rem;color:#1a2744;font-weight:800;margin-bottom:16px">📋 월 샘터 보고서</h2><div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center"><select id="mr-samter" onchange="renderMonthlyForm()" style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">'+buildSamterOptions()+'</select><select id="mr-month" onchange="renderMonthlyForm()" style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">'+mOpts+'</select><input id="mr-date" type="text" placeholder="모임일시 (예: 02/08/26)" style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;width:140px;font-family:inherit"><input id="mr-place" type="text" placeholder="모임장소" style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;width:110px;font-family:inherit"></div><div id="monthly-form-body"></div><div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button onclick="saveMonthlyData()" style="padding:9px 20px;background:#2d6a4f;color:#fff;border:none;border-radius:7px;font-size:.82rem;font-weight:600;cursor:pointer">💾 저장</button><button onclick="printMonthlyReport()" style="padding:9px 20px;background:#1a2744;color:#fff;border:none;border-radius:7px;font-size:.82rem;font-weight:600;cursor:pointer">🖨 인쇄</button><button onclick="closeFullModal()" style="padding:9px 16px;background:#f0f0f0;color:#555;border:none;border-radius:7px;font-size:.82rem;cursor:pointer">닫기</button></div></div>');
  document.getElementById('mr-month').value=new Date().getMonth()+1;renderMonthlyForm();
}
function renderMonthlyForm(){
  const sNum=document.getElementById('mr-samter')?.value,mon=document.getElementById('mr-month')?.value,body=document.getElementById('monthly-form-body');
  if(!sNum||!body)return;
  const members=getMemberList(sNum),samter=getSamterByNum(sNum);
  if(!members.length){body.innerHTML='<p style="color:#888">조원이 없습니다.</p>';return;}
  const saved=attData[currentYear]?.[sNum]?.[mon]||{};
  const attCount=members.filter(m=>saved.hasOwnProperty(m)?saved[m]==='O':true).length;
  const total=members.length,rate=total>0?Math.round(attCount/total*100):0,half=Math.ceil(members.length/2);
  function mkRows(list,off){return list.map((name,i)=>{const v=saved.hasOwnProperty(name)?saved[name]:'O';return'<div style="display:grid;grid-template-columns:28px 1fr 44px 1fr;border-bottom:.5px solid #eee"><span style="padding:4px;text-align:center;font-size:.75rem;border-right:1px solid #eee">'+(off+i+1)+'</span><span style="padding:4px 6px;font-size:.78rem;border-right:1px solid #eee">'+name+'</span><span style="padding:2px;text-align:center;border-right:1px solid #eee"><select data-member="'+name+'" class="att-sel" style="border:1px solid #ddd;border-radius:3px;font-size:.75rem;padding:1px;width:40px;font-family:inherit"><option value="O" '+(v==='O'?'selected':'')+'>O</option><option value="X" '+(v==='X'?'selected':'')+'>X</option></select></span><span style="padding:2px 4px"><input type="text" data-reason="'+name+'" class="att-reason" value="'+(saved[name+'_reason']||'')+'" style="border:none;width:100%;font-size:.74rem;font-family:inherit;outline:none"></span></div>';}).join('');}
  body.innerHTML='<div style="border:1.5px solid #1a2744;border-radius:4px;overflow:hidden;margin-bottom:10px"><table style="width:100%;border-collapse:collapse;background:#e8edf7"><tr style="font-size:.77rem;font-weight:700;color:#1a2744"><td style="padding:6px 10px;border:1px solid #b8c8e0">샘터</td><td style="padding:6px 10px;border:1px solid #b8c8e0;font-weight:800">'+sNum+'</td><td style="padding:6px 10px;border:1px solid #b8c8e0">청지기</td><td style="padding:6px 10px;border:1px solid #b8c8e0">'+(samter?.keeper||'')+'</td><td style="padding:6px 10px;border:1px solid #b8c8e0">지구장</td><td style="padding:6px 10px;border:1px solid #b8c8e0">'+getDistrictChief(sNum)+'</td><td style="padding:6px 10px;border:1px solid #b8c8e0">총원</td><td style="padding:6px 10px;border:1px solid #b8c8e0">'+total+'명</td><td style="padding:6px 10px;border:1px solid #b8c8e0">참석</td><td id="att-count-cell" style="padding:6px 10px;border:1px solid #b8c8e0;font-weight:700;color:#2d6a4f">'+attCount+'명</td><td style="padding:6px 10px;border:1px solid #b8c8e0">출석률</td><td id="att-rate-cell" style="padding:6px 10px;border:1px solid #b8c8e0;font-weight:700;color:#3a5a8c">'+rate+'%</td></tr></table><div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ddd"><div><div style="display:grid;grid-template-columns:28px 1fr 44px 1fr;background:#3a5a8c;color:#fff;font-size:.73rem"><span style="padding:5px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">번호</span><span style="padding:5px;border-right:1px solid rgba(255,255,255,.2)">성명</span><span style="padding:5px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">출결</span><span style="padding:5px">결석사유</span></div>'+mkRows(members.slice(0,half),0)+'</div><div style="border-left:1px solid #ddd"><div style="display:grid;grid-template-columns:28px 1fr 44px 1fr;background:#3a5a8c;color:#fff;font-size:.73rem"><span style="padding:5px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">번호</span><span style="padding:5px;border-right:1px solid rgba(255,255,255,.2)">성명</span><span style="padding:5px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">출결</span><span style="padding:5px">결석사유</span></div>'+mkRows(members.slice(half),half)+'</div></div><table style="width:100%;border-collapse:collapse"><tr><td style="border:1px solid #ddd;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600;width:70px">새교우</td><td style="border:1px solid #ddd;padding:5px"><input id="mr-new" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="'+(saved['_new']||'')+'"></td></tr><tr><td style="border:1px solid #ddd;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600">보고사항</td><td style="border:1px solid #ddd;padding:5px"><input id="mr-report" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="'+(saved['_report']||'')+'"></td></tr><tr><td style="border:1px solid #ddd;padding:5px 8px;background:#f0f3f8;font-size:.75rem;font-weight:600">건의사항</td><td style="border:1px solid #ddd;padding:5px"><input id="mr-suggest" type="text" style="border:none;width:100%;font-family:inherit;font-size:.75rem;outline:none" value="'+(saved['_suggest']||'')+'"></td></tr></table></div>';
  body.querySelectorAll('.att-sel').forEach(sel=>{sel.addEventListener('change',()=>{const cnt2=[...body.querySelectorAll('.att-sel')].filter(s=>s.value==='O').length,tot2=body.querySelectorAll('.att-sel').length;const cc=document.getElementById('att-count-cell'),rc=document.getElementById('att-rate-cell');if(cc)cc.textContent=cnt2+'명';if(rc)rc.textContent=(tot2>0?Math.round(cnt2/tot2*100):0)+'%';});});
}
async function saveMonthlyData(){
  const sNum=document.getElementById('mr-samter')?.value,mon=document.getElementById('mr-month')?.value;
  if(!sNum||!mon){toast('샘터와 월을 선택하세요','err');return;}
  const rec={};document.querySelectorAll('.att-sel').forEach(s=>{rec[s.dataset.member]=s.value;});document.querySelectorAll('.att-reason').forEach(i=>{if(i.value)rec[i.dataset.reason+'_reason']=i.value;});
  rec['_new']=document.getElementById('mr-new')?.value||'';rec['_report']=document.getElementById('mr-report')?.value||'';rec['_suggest']=document.getElementById('mr-suggest')?.value||'';
  if(!attData[currentYear])attData[currentYear]={};if(!attData[currentYear][sNum])attData[currentYear][sNum]={};attData[currentYear][sNum][mon]=rec;
  try{localStorage.setItem(ATT_KEY,JSON.stringify(attData));}catch(e){}
  try{await apiCall({action:'saveAtt',year:currentYear,samter:sNum,month:mon,record:rec});toast(sNum+'샘터 '+mon+'월 저장 완료','ok');}catch(e){toast('로컬 저장 완료','ok');}
  renderMonthlyForm();
}
function printMonthlyReport(){
  const body=document.getElementById('monthly-form-body');if(!body)return;
  const sNum=document.getElementById('mr-samter').value,mon=document.getElementById('mr-month').value,date=document.getElementById('mr-date').value,place=document.getElementById('mr-place').value;
  const w=window.open('','_blank');w.document.write('<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>'+sNum+'샘터 '+mon+'월 보고서</title><style>body{font-family:"Noto Sans KR",sans-serif;padding:20px;font-size:12px}h2{font-family:"Nanum Myeongjo",serif;color:#1a2744;margin-bottom:8px}@media print{button{display:none}}</style></head><body><h2>'+currentYear+'년 시카고 언약장로교회 말씀의 샘터부 보고서</h2><p style="font-size:11px;color:#888;margin-bottom:8px">모임일시: '+(date||'　　')+' &nbsp; 모임장소: '+(place||'　　')+'</p>'+body.innerHTML+'<p style="font-size:10px;color:#888;margin-top:12px">보고서 제출은 본당 예배실 Lobby 책장위에 있는 각 지구함에 넣어 주세요.</p><script>window.onload=function(){window.print();}<\/script></body></html>');w.document.close();
}
function openYearlyModal(){
  openFullModal('<div style="background:#fff;border-radius:12px;width:100%;max-width:920px;padding:28px 24px 24px;position:relative;margin:auto"><button onclick="closeFullModal()" style="position:absolute;top:14px;right:16px;background:#f0f0f0;border:none;border-radius:50%;width:28px;height:28px;font-size:.8rem;cursor:pointer">✕</button><h2 style="font-family:\'Nanum Myeongjo\',serif;font-size:1.05rem;color:#1a2744;font-weight:800;margin-bottom:16px">📅 년중 샘터 출석 상황 ('+currentYear+'년)</h2><div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;flex-wrap:wrap"><select id="yr-samter" onchange="renderYearlyTable()" style="padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:.85rem;font-family:inherit">'+buildSamterOptions()+'</select><button onclick="printYearlyReport()" style="padding:7px 14px;background:#1a2744;color:#fff;border:none;border-radius:6px;font-size:.78rem;cursor:pointer">🖨 인쇄</button><button onclick="closeFullModal()" style="padding:7px 12px;background:#f0f0f0;color:#555;border:none;border-radius:6px;font-size:.78rem;cursor:pointer">닫기</button></div><div id="yearly-table-body" style="overflow-x:auto"></div></div>');
  renderYearlyTable();
}
function renderYearlyTable(){
  const sNum=document.getElementById('yr-samter')?.value,body=document.getElementById('yearly-table-body');if(!sNum||!body)return;
  const members=getMemberList(sNum),mL=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  let html='<table style="width:100%;border-collapse:collapse;font-size:.75rem;min-width:700px"><thead><tr style="background:#1a2744;color:#fff"><th style="padding:7px 8px;border:1px solid rgba(255,255,255,.2);text-align:left">번호</th><th style="padding:7px 8px;border:1px solid rgba(255,255,255,.2);text-align:left;min-width:90px">성명</th>';
  mL.forEach(m=>{html+='<th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:40px">'+m+'</th>';});
  html+='<th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:55px">출석달수<br><span style="font-size:.65rem;opacity:.8">(12개월중)</span></th><th style="padding:7px 4px;border:1px solid rgba(255,255,255,.2);text-align:center;min-width:44px">출석률</th></tr></thead><tbody>';
  members.forEach((name,idx)=>{
    let attM=0,cells='';for(let m=1;m<=12;m++){const rec=attData[currentYear]?.[sNum]?.[m];if(!rec){cells+='<td style="border:1px solid #ddd;text-align:center;color:#ccc">-</td>';continue;}const v=rec[name]||'';if(v==='O')attM++;const col=v==='O'?'#2d6a4f':v==='X'?'#c0392b':'#888';cells+='<td style="border:1px solid #ddd;text-align:center;color:'+col+';font-weight:'+(v?'700':'400')+'">'+(v||'·')+'</td>';}
    const rate=Math.round(attM/12*100),rc=rate>=80?'#2d6a4f':rate>=50?'#856404':'#c0392b';
    html+='<tr style="background:'+(idx%2?'#f9fafc':'#fff')+'"><td style="border:1px solid #ddd;padding:5px 6px;text-align:center">'+(idx+1)+'</td><td style="border:1px solid #ddd;padding:5px 8px">'+name+'</td>'+cells+'<td style="border:1px solid #ddd;padding:5px 4px;text-align:center;font-weight:700;color:#1a2744">'+attM+'/12</td><td style="border:1px solid #ddd;padding:5px 4px;text-align:center;font-weight:700;color:'+rc+'">'+rate+'%</td></tr>';
  });
  html+='<tr style="background:#e8edf7;font-weight:700"><td colspan="2" style="border:1px solid #ddd;padding:5px 6px;text-align:center">월별 참석수</td>';
  for(let m=1;m<=12;m++){const rec=attData[currentYear]?.[sNum]?.[m];if(!rec){html+='<td style="border:1px solid #ddd;text-align:center;color:#bbb">-</td>';continue;}html+='<td style="border:1px solid #ddd;text-align:center">'+members.filter(n=>rec[n]==='O').length+'</td>';}
  html+='<td colspan="2" style="border:1px solid #ddd"></td></tr></tbody></table>';body.innerHTML=html;
}
function printYearlyReport(){
  const sNum=document.getElementById('yr-samter')?.value,body=document.getElementById('yearly-table-body');if(!body)return;const samter=getSamterByNum(sNum);
  const w=window.open('','_blank');w.document.write('<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>'+sNum+'샘터 년중 출석상황</title><style>body{font-family:"Noto Sans KR",sans-serif;padding:16px;font-size:11px}h2{font-family:"Nanum Myeongjo",serif;color:#1a2744;margin-bottom:8px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:3px 5px}@media print{button{display:none}}</style></head><body><h2>'+currentYear+'년 시카고 언약장로교회 '+sNum+'샘터 년중 출석 상황</h2><p style="font-size:10px;color:#888;margin-bottom:8px">청지기: '+(samter?.keeper||'')+'</p>'+body.innerHTML+'<script>window.onload=function(){window.print();}<\/script></body></html>');w.document.close();
}

function openFullModal(html){let ov=document.getElementById('full-modal');if(!ov){ov=document.createElement('div');ov.id='full-modal';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:8000;overflow-y:auto;padding:20px;display:flex;justify-content:center;align-items:flex-start';document.body.appendChild(ov);}ov.innerHTML=html;ov.style.display='flex';}
function closeFullModal(){const ov=document.getElementById('full-modal');if(ov)ov.style.display='none';}
let _tt;
function toast(msg,type){const el=document.getElementById('toast');if(!el)return;el.textContent=(type==='ok'?'✓ ':'✕ ')+msg;el.className='show '+(type||'ok');clearTimeout(_tt);_tt=setTimeout(()=>{el.className='';},3500);}
document.addEventListener('click',e=>{if(!document.getElementById('yw')?.contains(e.target))closeYP();if(!document.getElementById('dpw')?.contains(e.target))closeDp();if(!document.getElementById('expw')?.contains(e.target))closeExport();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeYP();closeDp();cancelModal();closeFullModal();}});
