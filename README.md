# 大學申請入學檢定地圖（115・國立＋私立）

純 HTML、CSS、JavaScript，沒有前端框架或後端。

## 兩種查詢模式
- 單科模式：選「檢視科目」（六科任選），看各校系該科的檢定分布；設定自己的程度後，標出該科檢定符合的系組。
- 六科綜合模式：輸入六科學測級分（沒考留空），依當年度五標換算後，逐一比對各系組的六科與英聽檢定，
  結果分為「全部符合」「差 1 項」「差 2 項以上」。數A、數B 同列時任一科達標即可；APCS、術科檢定無法判斷，另行標示。
- 「檢定符合」不代表能通過倍率篩選或第二階段甄試。成績只存在使用者瀏覽器（localStorage）。

## 檔案
- index.html：網頁骨架、英文／英聽選擇器、特殊專案組開關、資料說明
- styles.css：藍色系配色，支援深色模式與手機版
- app.js：五層導覽、各科占比、累計篩選、可報判斷（含英聽）、114 比較、系組頁
- data.json：115 年 26 所國立＋32 所私立大學、2,131 個系組（含 182 個特殊專案組，網頁預設排除）
- source114.xlsx：114 年申請入學試算表，供 prepare.py 比對英文門檻變動
- source.xlsx：甄選會 115 申請入學校系資料
- prepare.py：把試算表轉成 data.json
- year_map.csv：年度對應清單（更名、拆組、合併、新設），只有「確認狀態＝已確認」的列會被採用
- special_overrides.csv：特殊專案組例外清單，只有「已確認」的列會被採用

## 人工確認流程
1. 執行 prepare.py 後，看 review/ 資料夾：
   - review/year_map_suggest.csv：還沒列進 year_map.csv 的未配對系組，附自動建議
   - review/special_review.csv：備註寫「僅招收弱勢身分」但系名沒被判為特殊的系組
2. 對照簡章確認後，把列複製到 year_map.csv 或 special_overrides.csv，
   「確認狀態」改成「已確認」，「依據」寫明出處。
3. 再跑一次 prepare.py。
year_map.csv 的「114系名」可填多個（以；分隔），用於合併；「關係」可填 更名／拆組／合併／新設。

## 本機瀏覽
    python -m http.server 8000
開啟 http://localhost:8000/ 。直接雙擊 index.html 會讀不到 data.json。

## 重新產生資料（例如 116 年簡章公布後）
    pip install openpyxl
    python prepare.py 116試算表.xlsx data.json --year 116 --prev source.xlsx
（--prev 直接放前一年的試算表即可）

## 每年要更新的地方
- prepare.py 的 STANDARDS：補上新年度學測五標（大考中心每年 2 月公布），否則 prepare.py 會報錯提醒

## 修改位置
- 國立／私立分類、分層與層級名稱：prepare.py 的 SECTORS
- 特殊專案組判斷：prepare.py 的 SPECIAL（系名）與 RESTRICT（備註），例外以 special_overrides.csv 為準
- 檢定判斷（單科／六科、數A數B二擇一、英聽、APCS）：app.js 的 evaluate；級分換算：toLevel
- 年度比較狀態：app.js 的 change
- 配色：styles.css 開頭的 :root
