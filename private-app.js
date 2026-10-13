let DATA,selectedSchool='',myEng='',myLis='',hideSpecial=true;
const app=document.getElementById('app'),LEVELS=['未設檢定','底標','後標','均標','前標','頂標'],SUBS=['國文','英文','數學A','數學B','社會','自然'];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=(a,b)=>b?(a/b*100).toFixed(1)+'%':'0%';
const allSchools=()=>Object.values(DATA.schools).sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant'));
const visible=s=>s.departments.filter(d=>!hideSpecial||!d.special);
const lisRank={A:3,B:2,C:1,F:0};
function status(d){
 const p=window.AdmissionProfile;
 if(p&&(p.profile.mode==='all'||p.profile.subject!=='英文')){
  const x=p.result(d);return x.state==='ok'?'檢定符合':x.state==='no'?x.text:'尚待確認成績';
 }
 if(!myEng)return '';
 if(LEVELS.indexOf(d.thresholds.英文)>LEVELS.indexOf(myEng))return '英文未達';
 if(!d.listening)return '英文檢定符合';
 if(!myLis)return '尚待確認英聽';
 return lisRank[myLis]>=lisRank[d.listening]?'英文／英聽檢定符合':'英聽未達';
}
function selector(){
  const e=document.getElementById('my-eng'),l=document.getElementById('my-lis'),h=document.getElementById('hide-special');
  e.innerHTML=['','頂標','前標','均標','後標','底標','未達底標'].map(v=>'<option value="'+v+'">'+(v||'不使用')+'</option>').join('');
  l.innerHTML=[['','未選'],['A','A 級'],['B','B 級'],['C','C 級'],['F','F 級／未考']].map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('');
  e.onchange=()=>{myEng=e.value;render()};l.onchange=()=>{myLis=l.value;render()};h.checked=true;h.onchange=()=>{hideSpecial=h.checked;render()};
}
const activeSubject=()=>window.AdmissionProfile?.profile.subject||'英文';
function cards(ds){
  return '<div class="summary"><div class="stat"><small>系組總數</small><b>'+ds.length+'</b></div>'+
  [[`未設${activeSubject()}檢定`,['未設檢定']],[`${activeSubject()}底標／後標`,['底標','後標']],[`${activeSubject()}均標`,['均標']],[`${activeSubject()}前標／頂標`,['前標','頂標']]].map(([t,ls])=>'<div class="stat"><small>'+t+'</small><b>'+ds.filter(d=>ls.includes(d.thresholds[activeSubject()])).length+'/'+ds.length+'</b></div>').join('')+'</div>';
}
function schoolPage(s){
  const ds=visible(s);
  app.innerHTML='<nav class="crumb"><a href="#private">私立大學</a> ／ '+escapeHTML(s.name)+'</nav><h1 class="bracket">'+escapeHTML(s.name)+'</h1>'+cards(ds)+
  '<section class="overview"><h2>六科檢定占比</h2><p class="muted">點選數字即可篩選下方系組；檢定類別互不重疊。</p><div class="table-wrap"><table><thead><tr><th>科目</th>'+LEVELS.map(l=>'<th>'+l+'</th>').join('')+'</tr></thead><tbody>'+SUBS.map(sub=>'<tr><td>'+sub+'</td>'+LEVELS.map(l=>{const n=ds.filter(d=>d.thresholds[sub]===l).length;return '<td><button class="cell" data-sub="'+sub+'" data-level="'+l+'"><b>'+n+'/'+ds.length+'</b><small>'+percent(n,ds.length)+'</small></button></td>'}).join('')+'</tr>').join('')+'</tbody></table></div></section>'+
  '<section id="programs"><h2>招生系組明細</h2><div class="toolbar"><input class="search" id="q" placeholder="搜尋系組"><select id="sub"><option value="">全部科目</option>'+SUBS.map(s=>'<option>'+s+'</option>').join('')+'</select><select id="level"><option value="">全部門檻</option>'+LEVELS.map(s=>'<option>'+s+'</option>').join('')+'</select><label class="chk"><input type="checkbox" id="ok"> 只看英文／英聽檢定符合</label></div><p class="muted" id="count"></p><div class="dept-list" id="dept-list"></div></section>';
  const q=document.getElementById('q'),sub=document.getElementById('sub'),lv=document.getElementById('level'),ok=document.getElementById('ok');
  function update(){const list=ds.filter(d=>(!q.value||d.name.includes(q.value.trim()))&&(!sub.value||!lv.value||d.thresholds[sub.value]===lv.value)&&(!ok.checked||status(d).includes('符合')));document.getElementById('count').textContent=list.length+' / '+ds.length+' 個系組';document.getElementById('dept-list').innerHTML=list.map(d=>'<a class="dept-card" href="#private-dept/'+s.id+'/'+d.id+'"><div class="kicker">'+escapeHTML(d.kind)+'</div><h3>'+escapeHTML(d.name)+'</h3><div class="muted">招生 '+d.seats+' 人'+(d.listening?'・英聽 '+d.listening+' 級':'')+(status(d)?'・'+status(d):'')+'</div><div class="chips">'+SUBS.map(sub=>'<span class="chip">'+sub+' '+d.thresholds[sub]+'</span>').join('')+'</div></a>').join('')||'<p class="empty">無符合條件的系組</p>'}
  [q,sub,lv,ok].forEach(x=>x.addEventListener(x===q?'input':'change',update));
  document.querySelectorAll('.cell').forEach(b=>b.onclick=()=>{sub.value=b.dataset.sub;lv.value=b.dataset.level;update();document.getElementById('programs').scrollIntoView({behavior:'smooth'})});update();
}
function detail(s,d){
  app.innerHTML='<nav class="crumb"><a href="#private">私立大學</a> ／ <a href="#private-school/'+s.id+'">'+escapeHTML(s.name)+'</a> ／ '+escapeHTML(d.name)+'</nav><h1 class="bracket">'+escapeHTML(d.name)+'</h1><p class="muted">'+escapeHTML(s.name)+'・招生 '+d.seats+' 人</p><p class="notice">'+(status(d)||'請在頁首選擇英文程度以評估英文檢定')+'。此結果不代表符合其他科目及完整報名資格。</p><div class="detail-grid"><section class="panel"><h2>第一階段檢定與倍率</h2><table><thead><tr><th>科目</th><th>檢定</th><th>倍率</th></tr></thead><tbody>'+SUBS.map(k=>'<tr><td>'+k+'</td><td>'+d.thresholds[k]+'</td><td>'+(d.screening[k]||'—')+'</td></tr>').join('')+'</tbody></table><p>英聽：'+(d.listening?d.listening+' 級':'未設檢定')+'</p></section><section class="panel"><h2>第二階段成績採計</h2><p>學測占甄選總成績：'+escapeHTML(d.佔甄選總成績比例||'0')+'%</p><div class="chips">'+SUBS.map(k=>'<span class="chip">'+k+' '+(d.weights[k]?'×'+d.weights[k]:'不採計')+'</span>').join('')+'</div><table><thead><tr><th>指定項目</th><th>占比</th></tr></thead><tbody>'+d.items.map(x=>'<tr><td>'+escapeHTML(x.name)+'</td><td>'+escapeHTML(x.ratio)+'%</td></tr>').join('')+'</tbody></table></section></div>'+['審查資料說明','指定項目說明','備註'].filter(k=>d[k]).map(k=>'<section class="panel"><h2>'+k+'</h2><div class="notes">'+escapeHTML(d[k])+'</div></section>').join('');
}
function home(){
 const schools=allSchools(),ds=schools.flatMap(visible);
 app.innerHTML='<nav class="crumb"><a href="index.html">首頁</a> ／ 私立大學</nav><div class="hero"><div><div class="kicker">115 學年度申請入學</div><h1 class="bracket">私立大學檢定地圖</h1><p class="muted">依學校名稱查詢，不使用主觀排名。選擇學校後可查看英文、英聽及六科門檻。</p></div><div class="hero-stat"><div><b>'+schools.length+'</b><span>私立大學</span></div><div><b>'+ds.length+'</b><span>招生系組</span></div></div></div><input class="search" id="school-q" placeholder="搜尋私立大學名稱"><div class="schools" id="school-list"></div>';
 const q=document.getElementById('school-q'),list=document.getElementById('school-list');function update(){list.innerHTML=schools.filter(s=>s.name.includes(q.value.trim())).map(s=>'<a class="school-pill" href="#private-school/'+s.id+'">'+escapeHTML(s.name)+'（'+visible(s).length+' 系組）</a>').join('')||'<p class="empty">找不到學校</p>'}q.oninput=update;update();
}
function render(){const p=location.hash.slice(1).split('/');if(p[0]==='private-school'&&DATA.schools[p[1]])schoolPage(DATA.schools[p[1]]);else if(p[0]==='private-dept'&&DATA.schools[p[1]]){const s=DATA.schools[p[1]],d=s.departments.find(d=>d.id===p[2]);d?detail(s,d):home()}else home();}
fetch('data-private.json').then(r=>{if(!r.ok)throw Error('private data unavailable');return r.json()}).then(d=>{DATA=d;selector();render();window.addEventListener('hashchange',render)}).catch(e=>{app.innerHTML='<h1>私立大學資料尚未就緒</h1><p>請確認 GitHub Actions 已完成產生 data-private.json。'+escapeHTML(e.message)+'</p>'});

document.addEventListener('admission-profile-change',()=>{const p=window.AdmissionProfile.profile;myEng=p.scores[p.subject]||'';myLis=p.listening||myLis;if(DATA)render()});
