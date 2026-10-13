# 115 學年度大學申請入學檢定地圖

國立／私立大學雙入口。純 HTML、CSS、JavaScript，GitHub Pages 可部署。

## 網站入口

- [總入口](https://nanchendk.github.io/ben-university-admission/)：選擇國立或私立
- [國立大學](https://nanchendk.github.io/ben-university-admission/national.html)：保留原 26 所、五層分類、114／115 比較
- [私立大學](https://nanchendk.github.io/ben-university-admission/private.html)：依校名、科系、六科與英文／英聽門檻查詢

## 主要檔案

| 檔案 | 用途 |
| --- | --- |
| index.html | 國立／私立雙入口 |
| national.html | 原國立大學查詢介面 |
| private.html | 新增私立大學查詢介面 |
| app.js / private-app.js | 國立／私立查詢功能 |
| styles.css | 共用視覺樣式 |
| data.json | 國立大學 115 年資料 |
| data-private.json | 私立大學 115 年資料，由 GitHub Actions 自動生成 |
| data114.json | 國立大學 114 年比對資料 |
| source.xlsx | 115 學年度申請入學來源試算表 |
| prepare.py / build_private.py | 國立／私立資料轉換程式 |

## 更新私立大學資料

修改 `source.xlsx` 或 `build_private.py` 後，GitHub Actions 的 `Build private university data` 工作流程會自動更新 `data-private.json`。也可以從 Actions 手動執行。

私立學校判斷：在 115 學年度申請入學資料中，排除「國立」及「臺北市立」學校。原國立入口沿用使用者自訂 26 所，**不是全部公立大學清單**。

## 本機執行

```bash
python -m http.server 8000
```

開啟 http://localhost:8000/ 。若本機未產生 `data-private.json`，先安裝 `openpyxl` 後執行 `python build_private.py`。

## 使用提醒

英文／英聽檢定符合不等於符合其他科目、術科、特殊身分或完整報名資格。招生名額及分則以[大學甄選入學委員會](https://www.cac.edu.tw/)公告為準。國立五層為自訂分類，並非官方排名。
