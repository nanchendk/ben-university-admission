# 國立大學英文門檻地圖（115 申請入學）

純 HTML、CSS、JavaScript，沒有前端框架或後端。

## 檔案
- index.html：網頁骨架、英文／英聽選擇器、特殊專案組開關、資料說明
- styles.css：藍色系配色，支援深色模式與手機版
- app.js：五層導覽、各科占比、累計篩選、可報判斷（含英聽）、114 比較、系組頁
- data.json：115 年 26 所國立大學、1,040 個系組（含 118 個特殊專案組，網頁預設排除）
- data114.json：114 年資料，供 prepare.py 比對英文門檻變動
- source.xlsx：甄選會 115 申請入學校系資料
- prepare.py：把試算表轉成 data.json

## 本機瀏覽
    python -m http.server 8000
開啟 http://localhost:8000/ 。直接雙擊 index.html 會讀不到 data.json。

## 重新產生資料（例如 116 年簡章公布後）
    pip install openpyxl
    python prepare.py 116試算表.xlsx data.json --year 116 --prev data115.json
（先把現在的 data.json 改名為 data115.json）

## 修改位置
- 五層學校配置：prepare.py 的 GROUPS
- 特殊專案組判斷：prepare.py 的 SPECIAL
- 層級名稱：app.js 的 TIER_NAMES
- 可報判斷：app.js 的 status
- 配色：styles.css 開頭的 :root
