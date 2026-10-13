let DATA;
const app=document.querySelector('#app');
const TIER_NAMES=['頂尖','台清交成政','四中・師大・北大','中段國立','地區型・教育大學'];
const LV_COLOR=['var(--l0)','var(--l1)','var(--l2)','var(--l3)','var(--l4)','var(--l5)'];
const ENG_OPTS=['','頂標','前標','均標','後標','底標','未達底標'];
const LIS_OPTS=[['','未選'],['A','A 級'],['B','B 級'],['C','C 級'],['F','F 級／未考']];
const LIS_RANK={A:3,B:2,C:1,F:0};
let filter=null, myEng='', myLis='', hideSpecial=true;
try{myEng=localStorage.getItem('myEng')||'';myLis=localStorage.getItem('myLis')||'';hideSpecial=localStorage.getItem('hideSpecial')!=='0'}catch(_){}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(n,t)=>t?(n/t*100).toFixed(1)+'%':'0%';
const short=s=>s.name.replace(/^國立/,'');
const rank=l=>l==='未達底標'?0:DATA.levels.indexOf(l);
const departments=codes=>codes.flatMap(c=>DATA.schools[c].departments.filter(d=>!hideSpecial||!d.special).map(d=>({...d,school:c})));
const counts=(ds,sub)=>DATA.levels.map(l=>ds.filter(d=>d.thresholds[sub]===l).length);
const activeSubject=()=>window.AdmissionProfile?.profile.subject||'英文';
const activeScore=()=>window.AdmissionProfile?.profile.scores?.[activeSubject()]||'';
const midUp=ds=>ds.filter(d=>rank(d.thresholds[activeSubject()])>=3).length;
const PY=()=>DATA.prevYear;
function change(d){ if(!PY()) return null; if(d.prevEnglish==null) return 'new'; const a=rank(d.prevEnglish),b=rank(d.thresholds.英文); return b>a?'up':b<a?'down':'same'; }
/* 英文報名判斷：'ok' 可報、'no' 英文未達、'listen' 學測英文可但需英聽（未選或英聽不足時） */
function status(d){
  const p=window.AdmissionProfile;
  if(p && (p.profile.mode==='all'||p.profile.subject!=='英文')){
    const x=p.result(d);
    return x.state==='ok'?'ok':x.state==='no'?'no':'listen';
  }
  if(!myEng)return null;
  if(rank(d.thresholds.英文)>rank(myEng))return 'no';
  if(!d.listening)return 'ok';
  if(!myLis)return 'listen';
  return LIS_RANK[myLis]>=LIS_RANK[d.listening]?'ok':'no';
}
const okCount=ds=>ds.filter(d=>status(d)==='ok').length;
function badge(d){
  const st=status(d);let b='';
  if(st==='ok') b+='<span class="badge ok">檢定符合</span>';
  else if(st==='no') b+=`<span class="badge no">${window.AdmissionProfile?.result(d).text||'檢定未達'}</span>`;
  else if(st==='listen') b+=`<span class="badge warn">${window.AdmissionProfile?.result(d).text||'尚待確認'}</span>`;
  const ch=change(d);
  if(ch==='down') b+=`<span class="badge chg-down">較${PY()}放寬</span>`;
  else if(ch==='up') b+=`<span class="badge chg-up">較${PY()}提高</span>`;
  else if(ch==='new') b+=`<span class="badge new">${PY()}無同名系組</span>`;
  return b;
}

function distribution(ds){
  const cs=counts(ds,activeSubject());
  return `<div class="bar" role="img" aria-label="${activeSubject()}檢定分布：${DATA.levels.map((l,i)=>l+cs[i]+'系組').join('、')}">${cs.map((n,i)=>`<span class="seg" title="${DATA.levels[i]} ${n}/${ds.length}" style="width:${pct(n,ds.length)};background:${LV_COLOR[i]}"></span>`).join('')}</div>
  <div class="legend">${cs.map((n,i)=>n?`<span><i class="dot" style="background:${LV_COLOR[i]}"></i>${DATA.levels[i]} ${n}/${ds.length}・${pct(n,ds.length)}</span>`:'').join('')}</div>`;
}
function crumb(s,d,t){return `<nav class="crumb" aria-label="路徑"><a href="#">首頁</a>${t?`<span>／</span><a href="#tier/${t}">第${t}層</a>`:''}${s?`<span>／</span><a href="#school/${s.id}">${esc(short(s))}</a>`:''}${d?`<span>／</span><span>${esc(d.name)}</span>`:''}</nav>`}

function tierCard(i){
  const codes=DATA.groups[i],ds=departments(codes);
  return `<article class="tier" data-schoolnames="${esc(codes.map(c=>DATA.schools[c].name).join(' '))}">
  <div><div class="tier-title">第${i+1}層</div><div class="tier-name">${TIER_NAMES[i]}</div><div class="muted">${codes.length} 所學校・${ds.length} 系組</div><a class="tier-link" href="#tier/${i+1}">查看這一層</a></div>
  <div><strong>${activeSubject()}檢定分布</strong>　<span class="muted">均標以上 ${midUp(ds)}/${ds.length}（${pct(midUp(ds),ds.length)}）</span>${distribution(ds)}
  ${activeScore()?`<div class="okline">以你的${activeSubject()}程度（${activeScore()}）檢定符合：${okCount(ds)}/${ds.length} 系組</div>`:''}
  <div class="schools">${codes.map(c=>`<a class="school-pill" href="#school/${c}">${esc(short(DATA.schools[c]))}</a>`).join('')}</div></div></article>`;
}
function home(){
  const all=departments(Object.keys(DATA.schools));
  app.innerHTML=`<section class="hero"><div><div class="kicker">${DATA.year} 學年度申請入學・學測檢定</div><h1 class="bracket">國立大學學測檢定地圖</h1><p class="muted">依五個層級瀏覽國立大學。點進學校，看各科有多少系組要求均標、前標或頂標；點占比格子就能列出那些系組。在上方選擇科目及成績，查看單科或六科檢定條件是否符合。</p></div><div class="hero-stat"><div><b>${Object.keys(DATA.schools).length}</b><span>國立大學</span></div><div><b>${all.length}</b><span>招生系組${hideSpecial?'（不含特殊專案組）':''}</span></div></div></section>
  <div class="notice">閱讀方式：<strong>五層 → 學校 → 各科門檻占比 → 系組明細</strong>。色條是目前選擇科目的檢定分布，越深代表門檻越高。五層是自訂分類，不是官方排名。${hideSpecial?'目前已排除只限特定身分報名的特殊專案組，可在右上角改回。':''}</div>
  <input id="school-search" class="search" aria-label="搜尋學校" placeholder="搜尋學校，例如：臺灣、中山、海洋">
  <section class="tiers">${DATA.groups.map((_,i)=>tierCard(i)).join('')}</section><p id="no-schools" class="empty" hidden>找不到學校，換個名稱試試。</p>`;
  document.querySelector('#school-search').oninput=e=>{const q=e.target.value.trim().replace(/台/g,'臺');let n=0;document.querySelectorAll('.tier').forEach(el=>{el.hidden=!el.dataset.schoolnames.includes(q);if(!el.hidden)n++});document.querySelector('#no-schools').hidden=!!n;};
}
function summary(ds){
  const n=ds.length,by=r=>ds.filter(d=>r.includes(rank(d.thresholds[activeSubject()]))).length;
  const parts=[['未設${activeSubject()}檢定',[0]],['${activeSubject()}底標・後標',[1,2]],['${activeSubject()}均標',[3]],['${activeSubject()}前標・頂標',[4,5]]];
  const up=ds.filter(d=>change(d)==='up').length,down=ds.filter(d=>change(d)==='down').length,nw=ds.filter(d=>change(d)==='new').length;
  return `<div class="summary"><div class="stat"><small>總招生系組</small><b>${n}</b></div>
  ${parts.map(([t,r])=>`<div class="stat"><small>${t}</small><b>${by(r)}/${n}</b></div>`).join('')}
  ${activeScore()?`<div class="stat ok"><small>檢定符合（${activeSubject()}）</small><b>${okCount(ds)}/${n}</b></div>`:''}</div>
  <p class="muted">四個${activeSubject()}分類互不重疊，加總等於總系組數；其中${activeSubject()}要求均標以上的共 ${midUp(ds)} 個。</p>
  ${PY()?`<p class="changes">與 ${PY()} 學年度相比，英文檢定<strong>放寬 ${down}</strong> 個、<strong>提高 ${up}</strong> 個系組${nw?`；另有 ${nw} 個系組在 ${PY()} 年找不到同名系組（新設或更名）`:''}。</p>`:''}`;
}
function overview(ds){
  return `<section class="overview"><h2>各科檢定要求占比</h2><p class="muted">每格＝要求該門檻的系組數／${ds.length} 個總系組。點格子列出名單；各格是互斥分類，例如「均標」只算明訂均標的系組。</p>
  <div class="table-wrap"><table><thead><tr><th>學測科目</th>${DATA.levels.map(l=>`<th>${l}</th>`).join('')}</tr></thead><tbody>
  ${DATA.subjects.map(sub=>`<tr class="${sub==='英文'?'english':''}"><td>${sub}</td>${counts(ds,sub).map((n,i)=>`<td><button class="cell ${!n?'zero':''}" data-sub="${sub}" data-level="${DATA.levels[i]}" aria-label="${sub}${DATA.levels[i]}，${n}個系組"><b>${n}/${ds.length}</b><small>${pct(n,ds.length)}</small></button></td>`).join('')}</tr>`).join('')}
  </tbody></table></div></section>`;
}
function listing(){
  return `<section id="programs"><h2>招生系組明細 <span id="result-count" class="muted"></span></h2>
  <div class="toolbar"><input id="dept-search" class="search" placeholder="搜尋科系或學校" aria-label="搜尋科系">
  <select id="subject" aria-label="篩選科目"><option value="">所有科目</option>${DATA.subjects.map(s=>`<option>${s}</option>`).join('')}</select>
  <select id="mode" aria-label="比較方式"><option value="eq">剛好是</option><option value="le">以下（含未設檢定）</option><option value="ge">以上</option></select>
  <select id="level" aria-label="篩選檢定門檻"><option value="">所有門檻</option>${DATA.levels.map(l=>`<option>${l}</option>`).join('')}</select>
  ${myEng?`<label class="chk"><input type="checkbox" id="only-ok"> 只看可報</label>`:''}
  ${PY()?`<label class="chk"><input type="checkbox" id="only-chg"> 只看英文門檻有變動</label>`:''}
  <button id="reset" class="clear">清除篩選</button></div>
  <p id="filter-label" class="muted"></p><div class="dept-list" id="dept-list"></div></section>`;
}
function match(d){
  if(!filter) return true;
  const a=rank(d.thresholds[filter.sub]),b=rank(filter.level);
  return filter.mode==='le'?a<=b:filter.mode==='ge'?a>=b:a===b;
}
function bindList(ds){
  const $=s=>document.querySelector(s);
  const sub=$('#subject'),level=$('#level'),mode=$('#mode'),search=$('#dept-search'),only=$('#only-ok'),chg=$('#only-chg');
  const modeTxt={eq:'剛好是',le:'以下（含未設檢定）',ge:'以上'};
  function update(){
    filter=sub.value&&level.value?{sub:sub.value,level:level.value,mode:mode.value}:null;
    const q=search.value.trim().replace(/台/g,'臺');
    const found=ds.filter(d=>match(d)&&(!only||!only.checked||status(d)==='ok')&&(!chg||!chg.checked||['up','down'].includes(change(d)))&&(d.name+DATA.schools[d.school].name).includes(q));
    $('#result-count').textContent=`・${found.length} 個系組`;
    $('#filter-label').textContent=(filter?`目前篩選：${filter.sub}${modeTxt[filter.mode]}「${filter.level}」`:'目前顯示全部系組')+(only&&only.checked?'，只看可報':'')+(chg&&chg.checked?'，只看英文門檻有變動':'')+`｜${found.length}/${ds.length} 個系組`;
    $('#dept-list').innerHTML=found.length?found.map(d=>`<a class="dept-card" href="#dept/${d.school}/${d.id}"><div class="kicker">${esc(short(DATA.schools[d.school]))}・${esc(d.kind)}${d.special?'・特殊專案組':''}</div><h3>${esc(d.name)}${badge(d)}</h3><div class="muted">招生 ${d.seats} 人・代碼 ${d.id}${d.listening?`・英聽 ${d.listening} 級`:''}</div><div class="chips">${DATA.subjects.map(s=>`<span class="chip ${s==='英文'?'en':''}">${s} ${d.thresholds[s]}</span>`).join('')}</div></a>`).join(''):'<p class="empty">沒有符合條件的系組。放寬門檻或清除篩選再試一次。</p>';
    document.querySelectorAll('.cell').forEach(b=>b.classList.toggle('active',!!filter&&filter.mode==='eq'&&b.dataset.sub===filter.sub&&b.dataset.level===filter.level));
  }
  [sub,level,mode].forEach(x=>x.onchange=update); search.oninput=update; if(only) only.onchange=update; if(chg) chg.onchange=update;
  $('#reset').onclick=()=>{sub.value='';level.value='';mode.value='eq';search.value='';if(only)only.checked=false;if(chg)chg.checked=false;update()};
  document.querySelectorAll('.cell').forEach(b=>b.onclick=()=>{sub.value=b.dataset.sub;level.value=b.dataset.level;mode.value='eq';update();$('#programs').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})});
  update();
}
function scope(codes,title,t,s){
  const ds=departments(codes);
  app.innerHTML=`${crumb(s,null,t)}<div class="kicker">${DATA.year} 學年度申請入學・各科檢定統計</div><h1 class="bracket">${esc(title)}</h1>
  ${summary(ds)}${!s?`<div class="schools">${codes.map(c=>`<a class="school-pill" href="#school/${c}">${esc(short(DATA.schools[c]))}</a>`).join('')}</div>`:''}
  ${overview(ds)}${listing()}`;
  bindList(ds);
}
function detail(s,d){
  const st=status(d),ch=change(d);
  const v= st==='ok'?`<div class="verdict ok">以你的程度（英文${myEng}${myLis?'、英聽 '+myLis+' 級':''}），這個系的英文${d.listening?'與英聽':''}檢定過得了。</div>`
    : st==='no'?`<div class="verdict no">${rank(d.thresholds.英文)>rank(myEng)?`這個系要求英文${d.thresholds.英文}，以你的英文程度（${myEng}）檢定過不了。`:`學測英文過得了，但這個系要求英聽 ${d.listening} 級，你選的英聽（${myLis}）不夠。`}</div>`
    : st==='listen'?`<div class="verdict warn">學測英文過得了，但這個系另外要求英聽 ${d.listening} 級。請在右上角選擇你的英聽等級。</div>`:'';
  app.innerHTML=`${crumb(s,d,s.tier)}<div class="kicker">系組代碼 ${d.id}${d.special?'・特殊專案組（限特定身分報名）':''}</div><h1 class="bracket">${esc(d.name)}</h1><p class="muted">${esc(s.name)}・${esc(d.kind)}・招生 ${d.seats} 人</p>
  ${v}${ch==='up'||ch==='down'?`<p class="changes">英文檢定：${PY()} 年「${d.prevEnglish}」→ ${DATA.year} 年「${d.thresholds.英文}」（${ch==='down'?'放寬':'提高'}）</p>`:ch==='same'?`<p class="changes muted">英文檢定與 ${PY()} 年相同。</p>`:ch==='new'?`<p class="changes muted">${PY()} 年沒有同名系組，可能是新設或更名。</p>`:''}
  <div class="detail-grid"><section class="panel"><h2>第一階段：學測檢定與篩選</h2><table><thead><tr><th>科目</th><th>檢定要求</th><th>篩選倍率</th></tr></thead><tbody>
  ${DATA.subjects.map(sub=>`<tr${sub==='英文'?' class="english"':''}><td>${sub}</td><td>${d.thresholds[sub]}</td><td>${d.screening[sub]?esc(d.screening[sub])+' 倍':'—'}</td></tr>`).join('')}</tbody></table>
  <p class="muted">篩選倍率決定進入第二階段的人數，不是成績加權。「未設檢定」的科目仍可能用來篩選。</p>
  ${d.自設科目組合?`<p>組合篩選：${esc(d.自設科目組合)}・${esc(d.自設科目組合倍率)} 倍</p>`:''}
  <p>英聽檢定：${d.listening?d.listening+' 級':'未設檢定'}</p>
  ${d.apcs[0]||d.apcs[1]?`<p>APCS 程式識讀／實作：${esc(d.apcs[0])||'—'}／${esc(d.apcs[1])||'—'}</p>`:''}
  <p>術科考試：${esc(d.術科考試)||'未列要求'}</p></section>
  <section class="panel"><h2>第二階段：成績採計</h2><p>學測成績占甄選總成績：<strong>${esc(d.佔甄選總成績比例)||'0'}%</strong></p>
  ${d.artsTest?'<p class="verdict warn">這是術科類系組，總成績另含術科考試成績，所以下方學測與甄試項目的比例加總可能不到 100%。</p>':''}
  <div class="chips">${DATA.subjects.map(sub=>`<span class="chip ${sub==='英文'?'en':''}">${sub} ${d.weights[sub]?'× '+esc(d.weights[sub]):'不採計'}</span>`).join('')}</div>
  <p class="muted">以上是學測各科的採計權重，英文 ×1 不代表英文占總成績 100%。</p>
  <table><thead><tr><th>指定甄試項目</th><th>總成績占比</th></tr></thead><tbody>${d.items.map(x=>`<tr><td>${esc(x.name)}${x.threshold?'<br><small>檢定：'+esc(x.threshold)+'</small>':''}</td><td>${esc(x.ratio)}%</td></tr>`).join('')}</tbody></table></section></div>
  ${['審查資料說明','指定項目說明','備註'].filter(k=>d[k]).map(k=>`<section class="panel"><h2>${k}</h2><div class="notes">${esc(d[k])}</div></section>`).join('')}
  <a class="back" href="#school/${s.id}">返回${esc(short(s))}的各科占比</a>`;
}
function route(){
  filter=null;const [type,a,b]=location.hash.slice(1).split('/');
  if(type==='school'&&DATA.schools[a]){const s=DATA.schools[a];scope([a],s.name,s.tier,s)}
  else if(type==='tier'&&DATA.groups[Number(a)-1]){const n=Number(a);scope(DATA.groups[n-1],`第${n}層・${TIER_NAMES[n-1]}`,n)}
  else if(type==='dept'&&DATA.schools[a]){const s=DATA.schools[a],d=s.departments.find(d=>d.id===b);if(d)detail(s,{...d,school:a});else home()}
  else home();
  window.scrollTo(0,0);
}
function save(k,v){try{localStorage.setItem(k,v)}catch(_){}}
function initControls(){
  const e=document.querySelector('#my-eng'),l=document.querySelector('#my-lis'),h=document.querySelector('#hide-special');
  e.innerHTML=ENG_OPTS.map(v=>`<option value="${v}"${v===myEng?' selected':''}>${v||'不使用'}</option>`).join('');
  l.innerHTML=LIS_OPTS.map(([v,t])=>`<option value="${v}"${v===myLis?' selected':''}>${t}</option>`).join('');
  h.checked=hideSpecial;
  e.onchange=()=>{myEng=e.value;save('myEng',myEng);if(window.AdmissionProfile){window.AdmissionProfile.profile.scores.英文=myEng;document.dispatchEvent(new Event('admission-profile-change'))}else route()};
  l.onchange=()=>{myLis=l.value;save('myLis',myLis);route()};
  h.onchange=()=>{hideSpecial=h.checked;save('hideSpecial',hideSpecial?'1':'0');route()};
}
function start(d){DATA=d;initControls();route();window.addEventListener('hashchange',route);document.addEventListener('admission-profile-change',()=>{const p=window.AdmissionProfile.profile;if(p.mode==='single'&&p.subject==='英文'){myEng=p.scores.英文||''}else{myEng=p.scores[p.subject]||''}route()})}
if(window.__DATA__) start(window.__DATA__);
else fetch('data.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(start).catch(()=>{app.innerHTML='<h1>暫時無法載入資料</h1><p>請透過 HTTP 伺服器開啟（例如 python -m http.server），再重新整理。</p>'});
