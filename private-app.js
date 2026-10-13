// 私立與國立共用 app.js 的同一套 Dashboard、校系頁與統計邏輯。
fetch('data-private.json').then(r=>{if(!r.ok)throw Error('資料載入失敗 '+r.status);return r.json()}).then(data=>{
 const ids=Object.keys(data.schools).sort((a,b)=>data.schools[a].name.localeCompare(data.schools[b].name,'zh-Hant'));
 const size=Math.ceil(ids.length/4);
 data.groups=[ids.slice(0,size),ids.slice(size,size*2),ids.slice(size*2,size*3),ids.slice(size*3)];
 data.private=true;
 data.prevYear=null;
 window.__DATA__=data;
 const script=document.createElement('script');script.src='app.js?v=20261013-unified';document.body.append(script);
}).catch(e=>{document.getElementById('app').innerHTML='<h1>私立大學資料載入失敗</h1><p>'+String(e.message)+'</p>'});
