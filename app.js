let DATA;
const app=document.querySelector('#app');
const LV_COLOR=['var(--l0)','var(--l1)','var(--l2)','var(--l3)','var(--l4)','var(--l5)'];
const LV_OPTS=['','頂標','前標','均標','後標','底標','未達底標'];
const LIS_OPTS=[['','未選'],['A','A 級'],['B','B 級'],['C','C 級'],['F','F 級／未考']];
const LIS_RANK={A:3,B:2,C:1,F:0};
const ICON={national:'<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 9l9-5 9 5z"/><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/></svg>',
 private:'<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/></svg>'};

/* ---------- 狀態（只存在使用者自己的瀏覽器） ---------- */
const st={mode:'single',bs:'英文',myLv:'',myLis:'',scores:{},hideSpecial:true};
try{Object.assign(st,JSON.parse(localStorage.getItem('admState')||'{}'))}catch(_){}
const save=()=>{try{localStorage.setItem('admState',JSON.stringify(st))}catch(_){}};
let filter=null;

/* ---------- 工具 ---------- */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(n,t)=>t?(n/t*100).toFixed(1)+'%':'0%';
const short=s=>s.name.replace(/^國立/,'');
const rank=l=>l==='未達底標'?0:DATA.levels.indexOf(l);          // 未設檢定=0 … 頂標=5
const SEC=k=>DATA.sectors[k];
const departments=codes=>codes.flatMap(c=>DATA.schools[c].departments.filter(d=>!st.hideSpecial||!d.special).map(d=>({...d,school:c})));
const counts=(ds,sub)=>DATA.levels.map(l=>ds.filter(d=>d.thresholds[sub]===l).length);
const midUp=(ds,sub=st.bs)=>ds.filter(d=>rank(d.thresholds[sub])>=3).length;
const PY=()=>DATA.prevYear;
const LVNAMES=['頂標','前標','均標','後標','底標'];
/* 級分換算五標：達到某標的最低級分即屬該標；低於底標為「未達底標」；空白為未考 */
function toLevel(sub,score){
  if(score===''||score==null) return null;
  const cut=DATA.standards[sub]; for(let i=0;i<5;i++) if(score>=cut[i]) return LVNAMES[i];
  return '未達底標';
}
const hasScores=()=>DATA.subjects.some(s=>st.scores[s]!==''&&st.scores[s]!=null);
const active=()=>st.mode==='full'?hasScores():!!st.myLv;

/* ---------- 判斷 ---------- */
/* 回傳 null（未設定成績）或 {state:'ok'|'near'|'no'|'listen', fails:[…], extra:bool} */
function evaluate(d){
  if(!active()) return null;
  const fails=[];
  if(st.mode==='single'){
    const req=d.thresholds[st.bs];
    if(rank(req)>rank(st.myLv)) fails.push({sub:st.bs,req,mine:st.myLv});
  }else{
    const lv={};DATA.subjects.forEach(s=>lv[s]=toLevel(s,st.scores[s]));
    const pass=s=>d.thresholds[s]==='未設檢定'||(lv[s]!=null&&rank(lv[s])>=rank(d.thresholds[s]));
    const mathA=d.thresholds['數學A']!=='未設檢定',mathB=d.thresholds['數學B']!=='未設檢定';
    DATA.subjects.forEach(s=>{
      if(d.thresholds[s]==='未設檢定') return;
      if((s==='數學A'||s==='數學B')&&mathA&&mathB){ if(pass('數學A')||pass('數學B')) return;   // 數A、數B 同列時任一達標即可
        if(s==='數學B') return; fails.push({sub:'數學A或數學B',req:`${d.thresholds['數學A']}／${d.thresholds['數學B']}`,mine:`${lv['數學A']||'未考'}／${lv['數學B']||'未考'}`}); return; }
      if(!pass(s)) fails.push({sub:s,req:d.thresholds[s],mine:lv[s]||'未考'});
    });
  }
  const listenNeeded=d.listening&&(st.mode==='full'||st.bs==='英文');
  let listenPending=false;
  if(listenNeeded){
    if(!st.myLis) listenPending=true;
    else if(LIS_RANK[st.myLis]<LIS_RANK[d.listening]) fails.push({sub:'英聽',req:d.listening+' 級',mine:st.myLis+' 級'});
  }
  const extra=st.mode==='full'&&(!!(d.apcs[0]||d.apcs[1])||!!d.術科考試);
  const state=fails.length===0?(listenPending?'listen':'ok'):fails.length===1?'near':'no';
  return {state,fails,extra};
}
const okCount=ds=>ds.filter(d=>{const e=evaluate(d);return e&&e.state==='ok'}).length;
const nearCount=ds=>ds.filter(d=>{const e=evaluate(d);return e&&e.state==='near'}).length;
const okWord=()=>st.mode==='full'?'學測檢定全部符合':(st.bs==='英文'?'英文／英聽檢定符合':`${st.bs}檢定符合`);
function myDesc(){
  if(st.mode==='full'){const p=DATA.subjects.filter(s=>st.scores[s]!==''&&st.scores[s]!=null).map(s=>`${s.replace('數學','數')} ${st.scores[s]}`);return p.join('、')+(st.myLis?`、英聽 ${st.myLis}`:'');}
  return `${st.bs}${st.myLv}${st.bs==='英文'&&st.myLis?'、英聽 '+st.myLis:''}`;
}
/* 年度比較（依目前檢視科目） */
function change(d,sub=st.bs){
  if(!PY()) return null;
  if(d.prevStatus==='new') return 'new';
  if(d.prevStatus==='unmatched') return 'pending';
  const vs=[...new Set(d.prevValues.map(v=>v[sub]))]; if(vs.length>1) return 'mixed';
  const a=rank(vs[0]),b=rank(d.thresholds[sub]); return b>a?'up':b<a?'down':'same';
}
const failText=f=>`${f.sub}（要${f.req}，你是${f.mine}）`;
function badge(d){
  const e=evaluate(d);let b='';
  if(e){
    if(e.state==='ok') b+=`<span class="badge ok">${okWord()}</span>`;
    else if(e.state==='listen') b+=`<span class="badge warn">${st.mode==='full'?'學測':'英文'}檢定符合，另需英聽 ${d.listening} 級</span>`;
    else if(e.state==='near') b+=`<span class="badge near">差 1 項：${esc(failText(e.fails[0]))}</span>`;
    else b+=`<span class="badge no">${st.mode==='full'?`差 ${e.fails.length} 項`:`${e.fails[0].sub}檢定未達`}</span>`;
    if(e.extra&&e.state!=='no') b+=`<span class="badge new">另有${d.apcs[0]||d.apcs[1]?' APCS':''}${d.術科考試?' 術科':''} 檢定未判斷</span>`;
  }
  const ch=change(d);
  if(ch==='down') b+=`<span class="badge chg-down">${st.bs}較${PY()}放寬</span>`;
  else if(ch==='up') b+=`<span class="badge chg-up">${st.bs}較${PY()}提高</span>`;
  else if(ch==='mixed') b+=`<span class="badge new">${PY()}合併前門檻不一</span>`;
  else if(ch==='new') b+=`<span class="badge new">${DATA.year}新設</span>`;
  else if(ch==='pending') b+=`<span class="badge new">${PY()}未配對・待確認</span>`;
  return b;
}

/* ---------- 共用元件 ---------- */
function distribution(ds,sub=st.bs){
  const cs=counts(ds,sub);
  return `<div class="bar" role="img" aria-label="${sub}檢定分布：${DATA.levels.map((l,i)=>l+cs[i]+'系組').join('、')}">${cs.map((n,i)=>`<span class="seg" title="${DATA.levels[i]} ${n}/${ds.length}" style="width:${pct(n,ds.length)};background:${LV_COLOR[i]}"></span>`).join('')}</div>
  <div class="legend">${cs.map((n,i)=>n?`<span><i class="dot" style="background:${LV_COLOR[i]}"></i>${DATA.levels[i]} ${n}/${ds.length}・${pct(n,ds.length)}</span>`:'').join('')}</div>`;
}
const okLine=ds=>active()?`<div class="okline">${okWord()}（${esc(myDesc())}）：${okCount(ds)}/${ds.length} 系組${st.mode==='full'?`<span class="muted">・差 1 項 ${nearCount(ds)} 個</span>`:''}</div>`:'';
function crumb(sec,t,s,d){return `<nav class="crumb" aria-label="路徑"><a href="#">首頁</a>${sec?`<span>／</span><a href="#sector/${sec}">${SEC(sec).name}</a>`:''}${t?`<span>／</span><a href="#tier/${sec}/${t}">第${t}層</a>`:''}${s?`<span>／</span><a href="#school/${s.id}">${esc(short(s))}</a>`:''}${d?`<span>／</span><span>${esc(d.name)}</span>`:''}</nav>`}

/* ---------- 成績設定列 ---------- */
function scorebar(){
  const el=document.querySelector('#scorebar'); const subs=DATA.subjects;
  const lis=`<label class="fld"><span>英聽</span><select id="sb-lis">${LIS_OPTS.map(([v,t])=>`<option value="${v}"${v===st.myLis?' selected':''}>${t}</option>`).join('')}</select></label>`;
  const single=`<label class="fld"><span>我的${st.bs}程度</span><select id="sb-lv">${LV_OPTS.map(v=>`<option value="${v}"${v===st.myLv?' selected':''}>${v||'不使用'}</option>`).join('')}</select></label>${st.bs==='英文'?lis:''}`;
  const full=`${subs.map(s=>{const v=st.scores[s]??'';const lv=toLevel(s,v===''?null:+v);return `<label class="fld score"><span>${s}</span><input type="number" inputmode="numeric" min="0" max="15" placeholder="未考" data-sub="${s}" value="${esc(v)}"><small class="lvl">${lv||'&nbsp;'}</small></label>`}).join('')}${lis}<button class="clear" id="sb-clear">清除成績</button>`;
  el.innerHTML=`<div class="sb-row"><div class="tabs" role="tablist" aria-label="查詢模式"><button role="tab" aria-selected="${st.mode==='single'}" data-mode="single">單科模式</button><button role="tab" aria-selected="${st.mode==='full'}" data-mode="full">六科綜合模式</button></div>
    <label class="fld"><span>檢視科目</span><select id="sb-bs">${subs.map(s=>`<option${s===st.bs?' selected':''}>${s}</option>`).join('')}</select></label>
    <label class="chk"><input type="checkbox" id="sb-sp"${st.hideSpecial?' checked':''}> 排除特殊專案組</label></div>
    <div class="sb-row">${st.mode==='single'?single:full}</div>
    <p class="sb-note">${st.mode==='single'?`選擇一個科目，觀察各校系該科的檢定分布；設定你的程度後，會標出該科檢定符合的系組。`:`輸入 ${DATA.year} 學測級分（0～15，沒考請留空），系統依大考中心公布的五標自動換算，逐一比對各系組的六科與英聽檢定。數學A、數學B 同時列檢定時，任一科達標即可。`} 成績只存在你的瀏覽器，不會上傳。</p>`;
  el.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{st.mode=b.dataset.mode;save();scorebar();route()});
  el.querySelector('#sb-bs').onchange=e=>{st.bs=e.target.value;if(st.mode==='single')st.myLv='';save();scorebar();route()};
  el.querySelector('#sb-sp').onchange=e=>{st.hideSpecial=e.target.checked;save();route()};
  const lv=el.querySelector('#sb-lv'); if(lv) lv.onchange=e=>{st.myLv=e.target.value;save();route()};
  const ls=el.querySelector('#sb-lis'); if(ls) ls.onchange=e=>{st.myLis=e.target.value;save();route()};
  el.querySelectorAll('input[data-sub]').forEach(inp=>inp.onchange=()=>{let v=inp.value.trim();if(v!==''){v=Math.max(0,Math.min(15,Math.round(+v)));if(isNaN(v))v='';}st.scores[inp.dataset.sub]=v;save();scorebar();route()});
  const cl=el.querySelector('#sb-clear'); if(cl) cl.onclick=()=>{st.scores={};st.myLis='';save();scorebar();route()};
}

/* ---------- 頁面 ---------- */
function home(){
  const secs=Object.keys(DATA.sectors);
  const card=sec=>{const S=SEC(sec),codes=S.groups.flat(),ds=departments(codes);
    return `<a class="entry" href="#sector/${sec}"><span class="entry-icon">${ICON[sec]||''}</span><span class="entry-name">${S.name}</span><span class="entry-count">${codes.length} 所</span><span class="entry-desc" title="${S.tierNames.join('、')}">依${['','一','二','三','四','五','六'][S.groups.length]}層分類瀏覽</span><span class="chip-tag">${ds.length} 個系組・${st.bs}均標以上 ${pct(midUp(ds),ds.length)}</span>${active()?`<span class="chip-tag ok">${okWord()} ${okCount(ds)} 個</span>`:''}</a>`;};
  const steps=['選擇學校','選擇科系','檢定分析'];
  app.innerHTML=`<section class="portal">
    <h1 class="portal-title">${DATA.year} 學年度大學申請入學檢定地圖</h1>
    <p class="portal-sub">學測英文 × 六科檢定 × 英聽門檻 × 校系比較</p>
    <div class="entries">${secs.map(card).join('')}</div>
    <p class="steps-label">選擇學校類型後</p>
    <ol class="steps">${steps.map((t,i)=>`<li>${t}</li>${i<steps.length-1?'<li class="arrow" aria-hidden="true">›</li>':''}`).join('')}</ol>
    <a class="more" href="#overview" aria-label="往下看門檻一覽">⌄</a>
  </section>
  <section id="overview" class="overview-sec"><h2>${st.bs}門檻一覽</h2>
    <p class="muted">色條是各類學校的${st.bs}檢定分布，越深代表門檻越高。可在上方「檢視科目」切換科目。${st.hideSpecial?'已排除只限特定身分報名的特殊專案組。':''}</p>
    <div class="tiers">${secs.map(sec=>{const ds=departments(SEC(sec).groups.flat());return `<article class="tier"><div><div class="tier-title">${SEC(sec).name}</div><a class="tier-link" href="#sector/${sec}">進入${SEC(sec).name}</a></div><div><strong>${st.bs}檢定分布</strong>　<span class="muted">均標以上 ${midUp(ds)}/${ds.length}</span>${distribution(ds)}${okLine(ds)}</div></article>`}).join('')}</div>
    <div class="notice">分層是自訂分類，不是官方排名。「檢定符合」只代表通過學測（與英聽）檢定門檻，<strong>不代表能通過第一階段篩選</strong>：篩選還要看倍率、同級分超額篩選，之後還有第二階段甄試。</div>
  </section>`;
  document.querySelector('.more').onclick=ev=>{ev.preventDefault();document.querySelector('#overview').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})};
}
function tierCard(sec,i){
  const codes=SEC(sec).groups[i],ds=departments(codes);
  return `<article class="tier" data-schoolnames="${esc(codes.map(c=>DATA.schools[c].name).join(' '))}">
  <div><div class="tier-title">第${i+1}層</div><div class="tier-name">${SEC(sec).tierNames[i]}</div><div class="muted">${codes.length} 所學校・${ds.length} 系組</div><a class="tier-link" href="#tier/${sec}/${i+1}">查看這一層</a></div>
  <div><strong>${st.bs}檢定分布</strong>　<span class="muted">均標以上 ${midUp(ds)}/${ds.length}（${pct(midUp(ds),ds.length)}）</span>${distribution(ds)}${okLine(ds)}
  <div class="schools">${codes.map(c=>`<a class="school-pill" href="#school/${c}">${esc(short(DATA.schools[c]))}</a>`).join('')}</div></div></article>`;
}
function sectorPage(sec){
  const S=SEC(sec);
  app.innerHTML=`${crumb(sec)}<div class="kicker">${DATA.year} 學年度申請入學・學測檢定</div><h1 class="bracket">${S.name}</h1>
  <p class="muted">共 ${S.groups.flat().length} 所學校，分成 ${S.groups.length} 層。色條是${st.bs}檢定分布，越深代表門檻越高。</p>
  <input id="school-search" class="search" aria-label="搜尋學校" placeholder="搜尋學校，例如：${sec==='national'?'臺灣、中山、海洋':'輔仁、逢甲、長庚'}">
  <section class="tiers">${S.groups.map((_,i)=>tierCard(sec,i)).join('')}</section><p id="no-schools" class="empty" hidden>找不到學校，換個名稱試試。</p>`;
  document.querySelector('#school-search').oninput=e=>{const q=e.target.value.trim().replace(/台/g,'臺');let n=0;document.querySelectorAll('.tier').forEach(el=>{el.hidden=!el.dataset.schoolnames.includes(q);if(!el.hidden)n++});document.querySelector('#no-schools').hidden=!!n;};
}
function summary(ds){
  const n=ds.length,bs=st.bs,by=r=>ds.filter(d=>r.includes(rank(d.thresholds[bs]))).length;
  const parts=[[`未設${bs}檢定`,[0]],[`${bs}底標・後標`,[1,2]],[`${bs}均標`,[3]],[`${bs}前標・頂標`,[4,5]]];
  const cnt=k=>ds.filter(d=>change(d)===k).length,up=cnt('up'),down=cnt('down'),nw=cnt('new'),pend=cnt('pending'),mix=cnt('mixed');
  return `<div class="summary"><div class="stat"><small>總招生系組</small><b>${n}</b></div>
  ${parts.map(([t,r])=>`<div class="stat"><small>${t}</small><b>${by(r)}/${n}</b></div>`).join('')}
  ${active()?`<div class="stat ok"><small>${okWord()}</small><b>${okCount(ds)}/${n}</b></div>${st.mode==='full'?`<div class="stat"><small>差 1 項</small><b>${nearCount(ds)}/${n}</b></div>`:''}`:''}</div>
  <p class="muted">四個${bs}分類互不重疊，加總等於總系組數；其中要求${bs}均標以上的共 ${midUp(ds)} 個。</p>
  ${PY()?`<p class="changes">與 ${PY()} 學年度相比，${bs}檢定<strong>放寬 ${down}</strong> 個、<strong>提高 ${up}</strong> 個系組${nw?`；確認新設 ${nw} 個`:''}${mix?`；合併後門檻不一 ${mix} 個`:''}${pend?`；<strong>${pend} 個尚未配對到 ${PY()} 年系組，待人工確認</strong>`:''}。</p>`:''}`;
}
function overview(ds){
  return `<section class="overview"><h2>各科檢定要求占比</h2><p class="muted">每格＝要求該門檻的系組數／${ds.length} 個總系組。點格子列出名單；各格是互斥分類，例如「均標」只算明訂均標的系組。</p>
  <div class="table-wrap"><table><thead><tr><th>學測科目</th>${DATA.levels.map(l=>`<th>${l}</th>`).join('')}</tr></thead><tbody>
  ${DATA.subjects.map(sub=>`<tr class="${sub===st.bs?'english':''}"><td>${sub}</td>${counts(ds,sub).map((n,i)=>`<td><button class="cell ${!n?'zero':''}" data-sub="${sub}" data-level="${DATA.levels[i]}" aria-label="${sub}${DATA.levels[i]}，${n}個系組"><b>${n}/${ds.length}</b><small>${pct(n,ds.length)}</small></button></td>`).join('')}</tr>`).join('')}
  </tbody></table></div></section>`;
}
function listing(){
  const res=active()?(st.mode==='full'?`<select id="res" aria-label="檢定結果"><option value="">所有檢定結果</option><option value="ok">只看全部符合</option><option value="near">全部符合＋差 1 項</option><option value="nearOnly">只看差 1 項</option></select>`:`<label class="chk"><input type="checkbox" id="only-ok"> 只看${okWord()}</label>`):'';
  return `<section id="programs"><h2>招生系組明細 <span id="result-count" class="muted"></span></h2>
  <div class="toolbar"><input id="dept-search" class="search" placeholder="搜尋科系或學校" aria-label="搜尋科系">
  <select id="subject" aria-label="篩選科目"><option value="">所有科目</option>${DATA.subjects.map(s=>`<option>${s}</option>`).join('')}</select>
  <select id="mode" aria-label="比較方式"><option value="eq">剛好是</option><option value="le">以下（含未設檢定）</option><option value="ge">以上</option></select>
  <select id="level" aria-label="篩選檢定門檻"><option value="">所有門檻</option>${DATA.levels.map(l=>`<option>${l}</option>`).join('')}</select>
  ${res}${PY()?`<label class="chk"><input type="checkbox" id="only-chg"> 只看${st.bs}門檻有變動</label>`:''}
  <button id="reset" class="clear">清除篩選</button></div>
  ${active()&&st.mode==='full'?`<p class="notice">「全部符合」只代表第一階段學測檢定（含英聽）都達標，<strong>不代表能通過倍率篩選</strong>；有 APCS 或術科檢定的系組，網站無法判斷，會另外標示。</p>`:''}
  <p id="filter-label" class="muted"></p><div class="dept-list" id="dept-list"></div></section>`;
}
function match(d){
  if(!filter) return true;
  const a=rank(d.thresholds[filter.sub]),b=rank(filter.level);
  return filter.mode==='le'?a<=b:filter.mode==='ge'?a>=b:a===b;
}
function bindList(ds){
  const $=s=>document.querySelector(s);
  const sub=$('#subject'),level=$('#level'),mode=$('#mode'),search=$('#dept-search'),only=$('#only-ok'),res=$('#res'),chg=$('#only-chg');
  const modeTxt={eq:'剛好是',le:'以下（含未設檢定）',ge:'以上'};
  const resTxt={ok:'只看全部符合',near:'全部符合＋差 1 項',nearOnly:'只看差 1 項'};
  function resOk(d){const e=evaluate(d);if(only&&only.checked) return e&&e.state==='ok';if(!res||!res.value) return true;
    return res.value==='ok'?e.state==='ok':res.value==='near'?['ok','near'].includes(e.state):e.state==='near';}
  function update(){
    filter=sub.value&&level.value?{sub:sub.value,level:level.value,mode:mode.value}:null;
    const q=search.value.trim().replace(/台/g,'臺');
    const found=ds.filter(d=>match(d)&&resOk(d)&&(!chg||!chg.checked||['up','down'].includes(change(d)))&&(d.name+DATA.schools[d.school].name).includes(q));
    $('#result-count').textContent=`・${found.length} 個系組`;
    $('#filter-label').textContent=(filter?`目前篩選：${filter.sub}${modeTxt[filter.mode]}「${filter.level}」`:'目前顯示全部系組')+(only&&only.checked?`，只看${okWord()}`:'')+(res&&res.value?`，${resTxt[res.value]}`:'')+(chg&&chg.checked?`，只看${st.bs}門檻有變動`:'')+`｜${found.length}/${ds.length} 個系組`;
    $('#dept-list').innerHTML=found.length?found.map(d=>`<a class="dept-card" href="#dept/${d.school}/${d.id}"><div class="kicker">${esc(short(DATA.schools[d.school]))}・${esc(d.kind)}${d.special?'・特殊專案組':''}</div><h3>${esc(d.name)}${badge(d)}</h3><div class="muted">招生 ${d.seats} 人・代碼 ${d.id}${d.listening?`・英聽 ${d.listening} 級`:''}</div><div class="chips">${DATA.subjects.map(s=>`<span class="chip ${s===st.bs?'en':''}">${s} ${d.thresholds[s]}</span>`).join('')}</div></a>`).join(''):'<p class="empty">沒有符合條件的系組。放寬篩選條件再試一次。</p>';
    document.querySelectorAll('.cell').forEach(b=>b.classList.toggle('active',!!filter&&filter.mode==='eq'&&b.dataset.sub===filter.sub&&b.dataset.level===filter.level));
  }
  [sub,level,mode].forEach(x=>x.onchange=update); search.oninput=update; [only,res,chg].forEach(x=>{if(x)x.onchange=update});
  $('#reset').onclick=()=>{sub.value='';level.value='';mode.value='eq';search.value='';if(only)only.checked=false;if(res)res.value='';if(chg)chg.checked=false;update()};
  document.querySelectorAll('.cell').forEach(b=>b.onclick=()=>{sub.value=b.dataset.sub;level.value=b.dataset.level;mode.value='eq';update();$('#programs').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})});
  update();
}
function scope(codes,title,sec,t,s){
  const ds=departments(codes);
  app.innerHTML=`${crumb(sec,t,s)}<div class="kicker">${DATA.year} 學年度申請入學・各科檢定統計</div><h1 class="bracket">${esc(title)}</h1>
  ${summary(ds)}${!s?`<div class="schools">${codes.map(c=>`<a class="school-pill" href="#school/${c}">${esc(short(DATA.schools[c]))}</a>`).join('')}</div>`:''}
  ${overview(ds)}${listing()}`;
  bindList(ds);
}
function prevLine(d){
  if(!PY()) return '';
  const from=d.prevStatus==='mapped'?`（依年度對應清單：${d.prevRelation}自「${d.prevNames.join('」、「')}」）`:'';
  if(d.prevStatus==='new') return `<p class="changes muted">依年度對應清單，這是 ${DATA.year} 年新設的系組。</p>`;
  if(d.prevStatus==='unmatched') return `<p class="changes muted">${PY()} 年找不到同名系組，尚待人工確認是更名、拆組、合併或新設，所以暫不比較。</p>`;
  const diffs=DATA.subjects.map(s=>{const ch=change(d,s);if(ch==='up'||ch==='down')return `${s}「${d.prevValues[0][s]}」→「${d.thresholds[s]}」（${ch==='down'?'放寬':'提高'}）`;if(ch==='mixed')return `${s}合併前門檻不一`;return ''}).filter(Boolean);
  return diffs.length?`<p class="changes">與 ${PY()} 年相比：${diffs.join('；')}${from}</p>`:`<p class="changes muted">六科檢定與 ${PY()} 年相同${from}。</p>`;
}
function verdict(d){
  const e=evaluate(d); if(!e) return '';
  const extra=e.extra?`<br>另有${d.apcs[0]||d.apcs[1]?' APCS':''}${d.術科考試?' 術科':''} 檢定，網站沒有這些成績，無法判斷。`:'';
  const tail=' 其他條件（倍率篩選、甄試）仍須另外確認。';
  if(e.state==='ok') return `<div class="verdict ok">以你的成績（${esc(myDesc())}），${okWord()}。${extra}${tail}</div>`;
  if(e.state==='listen') return `<div class="verdict warn">學測檢定符合，但這個系另外要求英聽 ${d.listening} 級，請在上方選擇你的英聽等級。${extra}</div>`;
  return `<div class="verdict ${e.state==='near'?'warn':'no'}">${e.state==='near'?'只差 1 項':`差 ${e.fails.length} 項`}：${e.fails.map(f=>esc(failText(f))).join('；')}。${extra}</div>`;
}
function detail(s,d){
  app.innerHTML=`${crumb(s.sector,s.tier,s,d)}<div class="kicker">系組代碼 ${d.id}${d.special?`・特殊專案組（限特定身分報名，依${d.specialBy}判定）`:''}</div><h1 class="bracket">${esc(d.name)}</h1><p class="muted">${esc(s.name)}・${esc(d.kind)}・招生 ${d.seats} 人</p>
  ${verdict(d)}${prevLine(d)}
  <div class="detail-grid"><section class="panel"><h2>第一階段：學測檢定與篩選</h2><table><thead><tr><th>科目</th><th>檢定要求</th>${st.mode==='full'&&hasScores()?'<th>你的級分</th>':''}<th>篩選倍率</th></tr></thead><tbody>
  ${DATA.subjects.map(sub=>{const v=st.scores[sub];const has=v!==''&&v!=null;return `<tr${sub===st.bs?' class="english"':''}><td>${sub}</td><td>${d.thresholds[sub]}</td>${st.mode==='full'&&hasScores()?`<td>${has?`${v}（${toLevel(sub,+v)}）`:'未考'}</td>`:''}<td>${d.screening[sub]?esc(d.screening[sub])+' 倍':'—'}</td></tr>`}).join('')}</tbody></table>
  <p class="muted">篩選倍率決定進入第二階段的人數，不是成績加權。「未設檢定」的科目仍可能用來篩選。數學A、數學B 同時列檢定時，任一科達標即可。</p>
  ${d.自設科目組合?`<p>組合篩選：${esc(d.自設科目組合)}・${esc(d.自設科目組合倍率)} 倍</p>`:''}
  <p>英聽檢定：${d.listening?d.listening+' 級':'未設檢定'}</p>
  ${d.apcs[0]||d.apcs[1]?`<p>APCS 程式識讀／實作：${esc(d.apcs[0])||'—'}／${esc(d.apcs[1])||'—'}</p>`:''}
  <p>術科考試：${esc(d.術科考試)||'未列要求'}</p></section>
  <section class="panel"><h2>第二階段：成績採計</h2><p>學測成績占甄選總成績：<strong>${esc(d.佔甄選總成績比例)||'0'}%</strong></p>
  ${d.artsTest?'<p class="verdict warn">這是術科類系組，總成績另含術科考試成績，所以下方學測與甄試項目的比例加總可能不到 100%。</p>':''}
  <div class="chips">${DATA.subjects.map(sub=>`<span class="chip ${sub===st.bs?'en':''}">${sub} ${d.weights[sub]?'× '+esc(d.weights[sub]):'不採計'}</span>`).join('')}</div>
  <p class="muted">以上是學測各科的採計權重，×1 不代表該科占總成績 100%。</p>
  <table><thead><tr><th>指定甄試項目</th><th>總成績占比</th></tr></thead><tbody>${d.items.map(x=>`<tr><td>${esc(x.name)}${x.threshold?'<br><small>檢定：'+esc(x.threshold)+'</small>':''}</td><td>${esc(x.ratio)}%</td></tr>`).join('')}</tbody></table></section></div>
  ${['審查資料說明','指定項目說明','備註'].filter(k=>d[k]).map(k=>`<section class="panel"><h2>${k}</h2><div class="notes">${esc(d[k])}</div></section>`).join('')}
  <a class="back" href="#school/${s.id}">返回${esc(short(s))}的各科占比</a>`;
}
function route(){
  filter=null;const [type,a,b]=location.hash.slice(1).split('/');
  if(type==='school'&&DATA.schools[a]){const s=DATA.schools[a];scope([a],s.name,s.sector,s.tier,s)}
  else if(type==='sector'&&DATA.sectors[a]) sectorPage(a);
  else if(type==='tier'&&DATA.sectors[a]&&SEC(a).groups[Number(b)-1]){const n=Number(b);scope(SEC(a).groups[n-1],`${SEC(a).name}・第${n}層・${SEC(a).tierNames[n-1]}`,a,n)}
  else if(type==='dept'&&DATA.schools[a]){const s=DATA.schools[a],d=s.departments.find(d=>d.id===b);if(d)detail(s,{...d,school:a});else home()}
  else home();
  window.scrollTo(0,0);
}
function start(d){DATA=d;if(!DATA.subjects.includes(st.bs))st.bs='英文';scorebar();route();window.addEventListener('hashchange',route)}
if(window.__DATA__) start(window.__DATA__);
else fetch('data.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(start).catch(()=>{app.innerHTML='<h1>暫時無法載入資料</h1><p>請透過 HTTP 伺服器開啟（例如 python -m http.server），再重新整理。</p>'});
