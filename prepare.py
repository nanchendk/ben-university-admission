"""把甄選會「申請入學校系資料」試算表轉成網站用的 data.json。

用法：
    python prepare.py source.xlsx data.json --year 115 --prev data114.json
    --prev 可省略；提供時會比對前一年的英文檢定，標出變動。
需要套件：openpyxl
"""
import argparse, collections, json, re
from pathlib import Path
import openpyxl

GROUPS = [['001'], ['011','013','004','006'], ['016','027','003','041','002','099'],
          ['021','023','022','058','100','101','034'], ['150','151','036','038','153','032','031','033']]
SUBJECTS = ['國文','英文','數學A','數學B','社會','自然']
LEVELS = ['未設檢定','底標','後標','均標','前標','頂標']
# 只開放特定身分（經濟弱勢、青年儲蓄帳戶等）報名的專案組
SPECIAL = re.compile(r'青年儲蓄帳戶組|希望組|飛鳶組|屯蒙-|西灣南星|(晨光|興翼|成星|政星|旭日|向日葵聯合|揚鷹|柳川|嘉星)招生')
# 不同年度欄位名稱不同時，依序嘗試
ALIAS = {'APCS觀念':['程式識讀檢定','程式設計觀念題檢定'], 'APCS實作':['程式實作檢定','程式設計實作題檢定']}
EXTRA = ['大考英聽檢定','自設科目組合','自設科目組合倍率','術科考試','佔甄選總成績比例','審查資料說明','指定項目說明','備註']

def clean(v):
    if v is None or v == '--':
        return ''
    return re.sub(r'\s+', ' ', str(v).replace('_x000d_', '').replace('\xa0', ' ')).strip()

def pick(r, key):
    for k in ALIAS[key]:
        if k in r:
            return clean(r[k])
    return ''

def build(src, year, prev=None):
    rows = list(openpyxl.load_workbook(src, data_only=True, read_only=True).active.values)
    head, codes, schools = rows[0], sum(GROUPS, []), {}
    old = {}
    if prev:
        p = json.loads(Path(prev).read_text(encoding='utf8'))
        for s in p['schools'].values():
            for d in s['departments']:
                # 系組代碼每年會重新編排，同一個代碼可能變成別的系，所以只用「學校＋系名」對應
                old[(s['id'], clean(d['name']))] = d['thresholds']['英文']
    for row in rows[1:]:
        r = dict(zip(head, row)); code = clean(r['學校代號'])
        if code not in codes:
            continue
        s = schools.setdefault(code, {'id':code,'name':clean(r['學校名稱']),
             'tier':next(i+1 for i,g in enumerate(GROUPS) if code in g),'departments':[]})
        name = clean(r['學系名稱'])
        d = {'id':clean(r['學系代碼']),'name':name,'kind':clean(r['校系種類']) or '一般',
             'seats':int(r['招生名額'] or 0),'special':bool(SPECIAL.search(name)),
             'thresholds':{},'screening':{},'weights':{}}
        for sub in SUBJECTS:
            d['thresholds'][sub] = clean(r[sub+'檢定']) or '未設檢定'
            d['screening'][sub] = r[sub+'倍率'] or 0
            d['weights'][sub] = r[sub+'採計'] or 0
        for k in EXTRA:
            d[k] = clean(r.get(k))
        d['listening'] = d['大考英聽檢定'].replace('級', '')            # 'A' / 'B' / 'C' / ''
        d['apcs'] = [pick(r,'APCS觀念'), pick(r,'APCS實作')]
        d['artsTest'] = d['kind'] != '一般' or bool(d['術科考試'])
        d['items'] = [{'name':clean(r[f'指定項目{i}']),'ratio':clean(r[f'指定項目{i}成績比']),
                       'threshold':clean(r[f'指定項目{i}檢定'])} for i in range(1,7) if clean(r[f'指定項目{i}'])]
        if old:
            d['prevEnglish'] = old.get((code, name))   # 找不到則為 None（新設或更名的系組）
        s['departments'].append(d)
    missing = set(codes) - set(schools)
    assert not missing, f'試算表中找不到學校：{missing}'
    for s in schools.values():
        for d in s['departments']:
            bad = [v for v in d['thresholds'].values() if v not in LEVELS]
            assert not bad, f"{s['name']} {d['name']} 有無法辨識的門檻：{bad}"
    return {'year':year,'prevYear':(year-1) if prev else None,'groups':GROUPS,'subjects':SUBJECTS,
            'levels':LEVELS,'schools':schools}

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', nargs='?', default='source.xlsx')
    ap.add_argument('out', nargs='?', default='data.json')
    ap.add_argument('--year', type=int, default=115)
    ap.add_argument('--prev', help='前一年的 data.json，用來比對英文檢定變動')
    a = ap.parse_args()
    data = build(a.src, a.year, a.prev)
    Path(a.out).write_text(json.dumps(data, ensure_ascii=False), encoding='utf8')
    ds = [d for s in data['schools'].values() for d in s['departments']]
    print(len(data['schools']), '所學校；', len(ds), '個系組；特殊專案組', sum(d['special'] for d in ds),
          '；需英聽', sum(bool(d['listening']) for d in ds), '；術科', sum(d['artsTest'] for d in ds))
    if a.prev:
        R = {l:i for i,l in enumerate(LEVELS)}
        c = collections.Counter('新設' if d['prevEnglish'] is None else
              ('提高' if R[d['thresholds']['英文']] > R[d['prevEnglish']] else '降低' if R[d['thresholds']['英文']] < R[d['prevEnglish']] else '不變') for d in ds)
        print('英文檢定與前一年相比：', dict(c))
