"""從甄選會 115 申請入學試算表產生私立大學校系 JSON。"""
import json
import openpyxl
from pathlib import Path
from prepare import clean, SUBJECTS, LEVELS, EXTRA, SPECIAL, pick

def main():
    rows=openpyxl.load_workbook("source.xlsx",read_only=True,data_only=True).active.values
    head=next(rows)
    schools={}
    for row in rows:
        r=dict(zip(head,row))
        name=clean(r.get("學校名稱"))
        if not name or name.startswith("國立") or name.startswith("臺北市立"):
            continue
        code=clean(r.get("學校代號")).zfill(3)
        s=schools.setdefault(code,{"id":code,"name":name,"tier":None,"departments":[]})
        depname=clean(r.get("學系名稱"))
        d={"id":clean(r.get("學系代碼")),"name":depname,"kind":clean(r.get("校系種類")) or "一般",
           "seats":int(r.get("招生名額") or 0),"special":bool(SPECIAL.search(depname)),
           "thresholds":{},"screening":{},"weights":{}}
        for sub in SUBJECTS:
            d["thresholds"][sub]=clean(r.get(sub+"檢定")) or "未設檢定"
            d["screening"][sub]=r.get(sub+"倍率") or 0
            d["weights"][sub]=r.get(sub+"採計") or 0
        for key in EXTRA: d[key]=clean(r.get(key))
        d["listening"]=d["大考英聽檢定"].replace("級","")
        d["apcs"]=[pick(r,"APCS觀念"),pick(r,"APCS實作")]
        d["artsTest"]=d["kind"]!="一般" or bool(d["術科考試"])
        d["items"]=[{"name":clean(r.get(f"指定項目{i}")),"ratio":clean(r.get(f"指定項目{i}成績比")),"threshold":clean(r.get(f"指定項目{i}檢定"))} for i in range(1,7) if clean(r.get(f"指定項目{i}"))]
        if any(v not in LEVELS for v in d["thresholds"].values()):
            raise ValueError(f"Unknown threshold: {name} {depname}")
        s["departments"].append(d)
    assert len(schools)==32, f"Expected 32 private schools, got {len(schools)}"
    assert len({(s["id"],d["id"]) for s in schools.values() for d in s["departments"]})==sum(len(s["departments"]) for s in schools.values())
    output={"year":115,"prevYear":None,"groups":[],"subjects":SUBJECTS,"levels":LEVELS,"schools":schools}
    Path("data-private.json").write_text(json.dumps(output,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"Private universities: {len(schools)}; departments: {sum(len(s['departments']) for s in schools.values())}")

if __name__=="__main__": main()
