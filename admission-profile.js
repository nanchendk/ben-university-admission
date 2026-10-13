(function(){
 const subjects=['國文','英文','數學A','數學B','社會','自然'],levels=['','頂標','前標','均標','後標','底標','未達底標'];
 const profile={mode:'single',subject:'英文',scores:{},listening:''};
 try{Object.assign(profile,JSON.parse(localStorage.getItem('admission-profile')||'{}'))}catch(e){}
 const rank=l=>l==='未達底標'?0:['未設檢定','底標','後標','均標','前標','頂標'].indexOf(l);
 function result(d){
   const required=d.thresholds||{},subs=profile.mode==='single'?[profile.subject]:subjects;
   let checked=0,unknown=false,failed=[];
   for(const sub of subs){
     const need=required[sub]||'未設檢定';if(need==='未設檢定')continue;
     const own=profile.scores[sub]||'';
     if(!own){unknown=true;continue}
     checked++;
     if(rank(own)<rank(need))failed.push(sub+'需'+need);
   }
   // 数A與數B有擇一條件時，避免將兩者都當成必須符合。
   if(profile.mode==='all' && required['數學A']!=='未設檢定' && required['數學B']!=='未設檢定'){
     const a=profile.scores['數學A'],b=profile.scores['數學B'];
     if(a&&b){
       failed=failed.filter(x=>!x.startsWith('數學A')&&!x.startsWith('數學B'));
       if(rank(a)<rank(required['數學A'])&&rank(b)<rank(required['數學B']))failed.push('數A／數B擇一未達');
     }else if(!a&&!b)unknown=true;
     else if(a&&rank(a)>=rank(required['數學A'])||b&&rank(b)>=rank(required['數學B'])){unknown=false||unknown}
     else unknown=true;
   }
   if(failed.length)return {state:'no',text:failed.join('、')};
   if(profile.mode==='all'&&d.listening){
     if(!profile.listening)return {state:'pending',text:'尚待確認英聽'};
     const lis={A:3,B:2,C:1,F:0};
     if((lis[profile.listening]??-1)<(lis[d.listening]??0))return {state:'no',text:'英聽未達'};
   }
   if(unknown||checked===0)return {state:'pending',text:'成績未完整設定'};
   return {state:'ok',text:profile.mode==='all'?'六科檢定符合':'單科檢定符合'};
 }
 function save(){try{localStorage.setItem('admission-profile',JSON.stringify(profile))}catch(e){}}
 function mount(){
  const host=document.querySelector('header .myeng');if(!host)return;
  const panel=document.createElement('div');panel.id='subject-profile';panel.style.cssText='flex-basis:100%;padding:10px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center';
  const mode=document.createElement('select');mode.innerHTML='<option value="single">單科查詢</option><option value="all">六科綜合</option>';mode.value=profile.mode;panel.append('查詢模式 ',mode);
  const subject=document.createElement('select');subject.innerHTML=subjects.map(s=>'<option>'+s+'</option>').join('');subject.value=profile.subject;panel.append(subject);
  const score=document.createElement('select');score.innerHTML=levels.map(l=>'<option value="'+l+'">'+(l||'未輸入')+'</option>').join('');panel.append(score);
  const all=document.createElement('span');all.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
  const controls={};subjects.forEach(s=>{const wrap=document.createElement('label');wrap.style.cssText='display:flex;align-items:center;gap:3px;font-size:12px';const select=document.createElement('select');select.innerHTML=levels.map(l=>'<option value="'+l+'">'+(l||'未輸入')+'</option>').join('');select.value=profile.scores[s]||'';select.onchange=()=>{profile.scores[s]=select.value;save();refresh()};controls[s]=select;wrap.append(s,select);all.append(wrap)});panel.append(all);
  const help=document.createElement('small');help.textContent='符合檢定不代表通過倍率篩選或取得完整報名資格';panel.append(help);
  const refresh=()=>{subject.style.display=score.style.display=profile.mode==='single'?'':'none';all.style.display=profile.mode==='all'?'flex':'none';score.value=profile.scores[profile.subject]||'';subjects.forEach(s=>controls[s].value=profile.scores[s]||'');document.dispatchEvent(new Event('admission-profile-change'))};
  mode.onchange=()=>{profile.mode=mode.value;save();refresh()};subject.onchange=()=>{profile.subject=subject.value;save();refresh()};score.onchange=()=>{profile.scores[profile.subject]=score.value;save();refresh()};
  host.append(panel);refresh();
 }
 window.AdmissionProfile={profile,result,mount};
 document.addEventListener('DOMContentLoaded',mount);
})();