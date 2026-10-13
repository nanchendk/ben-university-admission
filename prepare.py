"""把甄選會「申請入學校系資料」試算表轉成網站用的 data.json。

用法：
    python prepare.py source.xlsx data.json --year 115 --prev source114.xlsx
選項：
    --prev       前一年的申請入學試算表（.xlsx）或 data.json，用來比對英文檢定變動
    --year-map   年度對應清單（預設 year_map.csv），處理更名、拆組、合併、新設
    --special    特殊專案組例外清單（預設 special_overrides.csv）
    --review     輸出待人工確認清單的資料夾（預設 review/）
需要套件：openpyxl
"""
import argparse, collections, csv, json, re, unicodedata, difflib
from pathlib import Path
import openpyxl

# 分類與分層皆為自訂（非官方排名），可依需要調整
SECTORS = {
  'national': {'name':'國立大學', 'groups':[['001'], ['011','013','004','006'], ['016','027','003','041','002','099'],
               ['021','023','022','058','100','101','034'], ['150','151','036','038','153','032','031','033']],
               'tierNames':['頂尖','台清交成政','四中・師大・北大','中段國立','地區型・教育大學']},
  'private':  {'name':'私立大學', 'groups':[['109','030','007','012','026','108','152'], ['020','005','008','040','015','014','009'],
               ['017','046','047','050','018','019','045','134'], ['042','044','051','059','065','079','110','112','113','130']],
               'tierNames':['醫學大學','前段綜合','中段綜合','其他私校']},
}
GROUPS = [g for s in SECTORS.values() for g in s['groups']]
def place(code):
    for sk, s in SECTORS.items():
        for i, g in enumerate(s['groups']):
            if code in g:
                return sk, i + 1
    return None, None
SUBJECTS = ['國文','英文','數學A','數學B','社會','自然']
LEVELS = ['未設檢定','底標','後標','均標','前標','頂標']
# 第一道判斷：系名含這些字樣的，是只限特定身分（經濟弱勢、青年儲蓄帳戶等）報名的專案組
SPECIAL = re.compile(r'青年儲蓄帳戶組|希望組|飛鳶組|屯蒙-|西灣南星|(晨光|興翼|成星|政星|旭日|向日葵聯合|揚鷹|柳川|嘉星)招生')
# 第二道判斷：備註寫明「僅招收／僅限…弱勢身分」的系組，列入待確認清單（願景計畫外加名額不算，因為一般生名額仍開放）
RESTRICT = re.compile(r'(僅招收|僅限招收|只招收|專收|限定)[^。；]{0,25}(低收入|中低收入|特殊境遇|經濟弱勢|經濟或文化不利|文化不利|新移民|新住民)')
ALIAS = {'APCS觀念':['程式識讀檢定','程式設計觀念題檢定'], 'APCS實作':['程式實作檢定','程式設計實作題檢定']}
EXTRA = ['大考英聽檢定','自設科目組合','自設科目組合倍率','術科考試','佔甄選總成績比例','審查資料說明','指定項目說明','備註']
R = {l:i for i,l in enumerate(LEVELS)}
# 學測五標（級分），用於把考生輸入的級分換算成五標。每年學測成績公布後更新。
# 來源：大考中心 115 學年度學科能力測驗各科成績標準（115/2/25 公布）
STANDARDS = {115: {'國文':[13,12,10,9,7], '英文':[13,11,8,5,3], '數學A':[12,10,8,5,4],
                   '數學B':[11,9,5,3,2], '社會':[13,12,10,8,7], '自然':[13,12,9,7,5]}}  # 頂、前、均、後、底

def clean(v):
    if v is None or v == '--':
        return ''
    return re.sub(r'\s+', ' ', str(v).replace('_x000d_', '').replace('\xa0', ' ')).strip()

def key(name):
    """系名比對用：全形半形統一、去空白。只處理寫法差異，不處理語意差異。"""
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', name))

def pick(r, k):
    for col in ALIAS[k]:
        if col in r:
            return clean(r[col])
    return ''

def read_csv(path):
    p = Path(path)
    if not p.exists():
        return []
    with p.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def build(src, year, prev=None, year_map='year_map.csv', special='special_overrides.csv'):
    rows = list(openpyxl.load_workbook(src, data_only=True, read_only=True).active.values)
    head, codes, schools = rows[0], sum(GROUPS, []), {}
    # 前一年資料：系組代碼每年會重新編排，所以只用「學校＋系名」對應
    old = {}
    if prev and prev.endswith('.xlsx'):
        prow = list(openpyxl.load_workbook(prev, data_only=True, read_only=True).active.values)
        for row in prow[1:]:
            pr = dict(zip(prow[0], row)); pc = clean(pr['學校代號'])
            if pc in codes:
                old[(pc, key(clean(pr['學系名稱'])))] = (clean(pr['學系名稱']), {sub: clean(pr[sub+'檢定']) or '未設檢定' for sub in SUBJECTS})
    elif prev:
        for s in json.loads(Path(prev).read_text(encoding='utf8'))['schools'].values():
            for d in s['departments']:
                old[(s['id'], key(d['name']))] = (d['name'], dict(d['thresholds']))
    ymap = {(r['學校代號'].zfill(3), key(r['115系名'])): r for r in read_csv(year_map) if r.get('確認狀態') == '已確認'}
    sp_over = {(r['學校代號'].zfill(3), key(r['學系名稱'])): r for r in read_csv(special) if r.get('確認狀態') == '已確認'}
    review_special = []
    for row in rows[1:]:
        r = dict(zip(head, row)); code = clean(r['學校代號'])
        if code not in codes:
            continue
        sec, tier = place(code)
        s = schools.setdefault(code, {'id':code,'name':clean(r['學校名稱']),'sector':sec,'tier':tier,'departments':[]})
        name = clean(r['學系名稱']); k = (code, key(name))
        d = {'id':clean(r['學系代碼']),'name':name,'kind':clean(r['校系種類']) or '一般',
             'seats':int(r['招生名額'] or 0),'thresholds':{},'screening':{},'weights':{}}
        # 特殊專案組：例外清單優先，其次系名關鍵字
        if k in sp_over:
            d['special'] = sp_over[k]['判定'] == '特殊'; d['specialBy'] = '例外清單'
        else:
            d['special'] = bool(SPECIAL.search(name)); d['specialBy'] = '系名' if d['special'] else ''
            text = clean(r.get('備註')) + clean(r.get('指定項目說明'))
            m = RESTRICT.search(text)
            if m and not d['special']:
                review_special.append({'學校代號':code,'學校名稱':s['name'],'學系名稱':name,'判定':'特殊',
                    '依據':text[max(0,m.start()-10):m.end()+20],'確認狀態':'待確認'})
        for sub in SUBJECTS:
            d['thresholds'][sub] = clean(r[sub+'檢定']) or '未設檢定'
            d['screening'][sub] = r[sub+'倍率'] or 0
            d['weights'][sub] = r[sub+'採計'] or 0
        for col in EXTRA:
            d[col] = clean(r.get(col))
        d['listening'] = d['大考英聽檢定'].replace('級', '')
        d['apcs'] = [pick(r,'APCS觀念'), pick(r,'APCS實作')]
        d['artsTest'] = d['kind'] != '一般' or bool(d['術科考試'])
        d['items'] = [{'name':clean(r[f'指定項目{i}']),'ratio':clean(r[f'指定項目{i}成績比']),
                       'threshold':clean(r[f'指定項目{i}檢定'])} for i in range(1,7) if clean(r[f'指定項目{i}'])]
        # 年度比較
        if old:
            d['prevNames'], d['prevValues'] = [], []
            if k in old:
                d['prevStatus'] = 'matched'; d['prevNames'] = [old[k][0]]; d['prevValues'] = [old[k][1]]
            elif k in ymap:
                m = ymap[k]
                if m['關係'] == '新設':
                    d['prevStatus'] = 'new'
                else:
                    names = [x.strip() for x in re.split('[;；]', m['114系名']) if x.strip()]
                    got = [old.get((code, key(x))) for x in names]
                    missing = [x for x, g in zip(names, got) if not g]
                    assert not missing, f"year_map 的 114 系名找不到：{s['name']} {missing}"
                    d['prevStatus'] = 'mapped'; d['prevRelation'] = m['關係']
                    d['prevNames'] = [g[0] for g in got]; d['prevValues'] = [g[1] for g in got]   # 每筆是六科檢定
            else:
                d['prevStatus'] = 'unmatched'
        s['departments'].append(d)
    missing = set(codes) - set(schools)
    assert not missing, f'試算表中找不到學校：{missing}'
    for s in schools.values():
        for d in s['departments']:
            bad = [v for v in d['thresholds'].values() if v not in LEVELS]
            assert not bad, f"{s['name']} {d['name']} 有無法辨識的門檻：{bad}"
    assert year in STANDARDS, f'請先在 STANDARDS 補上 {year} 學年度學測五標'
    data = {'year':year,'prevYear':(year-1) if prev else None,'sectors':SECTORS,'subjects':SUBJECTS,
            'standards':STANDARDS[year],
            'levels':LEVELS,'schools':schools}
    return data, old, review_special

def suggest(data, old):
    """為「未配對」系組產生對應建議，一律標為待確認，需人工核對簡章後改成已確認。"""
    used = collections.defaultdict(set)
    for s in data['schools'].values():
        for d in s['departments']:
            for n in d.get('prevNames', []):
                used[s['id']].add(key(n))
    def base(n):
        n = key(n)
        while True:
            m = re.sub(r'[(（][^)）]*[)）]$|[甲乙丙丁A-D]組$', '', n)
            if m == n:
                return n
            n = m
    # 招生類型標記不同（例如青年儲蓄帳戶組 vs 公費生），即使主系名相同也不算同一系組
    TAGS = ['青年儲蓄', '公費生', 'APCS', '資安', '普渡', '晨光']
    tags = lambda n: {t for t in TAGS if t in n}
    out = []
    for s in data['schools'].values():
        gone = [v[0] for (c, kk), v in old.items() if c == s['id'] and kk not in used[s['id']]]
        for d in s['departments']:
            if d.get('prevStatus') != 'unmatched':
                continue
            rel, cand = '新設', []
            same_base = [g for g in gone if base(g) == base(d['name']) and tags(g) == tags(d['name'])]
            if same_base:
                rel, cand = '拆組', same_base
            else:
                # 只比較主系名（去掉括號分組），避免「XX系(公費生)」被配到別系的公費生組
                # 另外要求開頭兩字相同，避免「土木工程學系」被配到「電機工程學系」
                bases = {base(g): g for g in gone if tags(g) == tags(d['name']) and base(g)[:2] == base(d['name'])[:2]}
                close = difflib.get_close_matches(base(d['name']), list(bases), n=1, cutoff=0.5)
                if close:
                    rel, cand = '更名', [bases[close[0]]]
            if rel == '新設' and re.search('公費生', d['name']):
                note = '公費生名額每年由教育部核定，多為當年新設'
            elif rel == '新設':
                note = '114 年找不到相近系名'
            else:
                note = '系名相近，請核對簡章確認'
            out.append({'學校代號':s['id'],'學校名稱':s['name'],'115系名':d['name'],'114系名':'；'.join(cand),
                        '關係':rel,'確認狀態':'待確認','依據':note,'特殊專案組':'是' if d['special'] else ''})
    return out

def write_csv(path, rows, cols):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', nargs='?', default='source.xlsx')
    ap.add_argument('out', nargs='?', default='data.json')
    ap.add_argument('--year', type=int, default=115)
    ap.add_argument('--prev')
    ap.add_argument('--year-map', default='year_map.csv')
    ap.add_argument('--special', default='special_overrides.csv')
    ap.add_argument('--review', default='review')
    a = ap.parse_args()
    data, old, rev_sp = build(a.src, a.year, a.prev, a.year_map, a.special)
    Path(a.out).write_text(json.dumps(data, ensure_ascii=False), encoding='utf8')
    ds = [d for s in data['schools'].values() for d in s['departments']]
    print(len(data['schools']), '所學校；', len(ds), '個系組；特殊專案組', sum(d['special'] for d in ds),
          f"（例外清單判定 {sum(d['specialBy']=='例外清單' and d['special'] for d in ds)}）；需英聽",
          sum(bool(d['listening']) for d in ds))
    rv = Path(a.review)
    write_csv(rv/'special_review.csv', rev_sp, ['學校代號','學校名稱','學系名稱','判定','依據','確認狀態'])
    print('特殊專案組待確認：', len(rev_sp), '筆 →', rv/'special_review.csv')
    if a.prev:
        print('年度對應：', dict(collections.Counter(d['prevStatus'] for d in ds)))
        listed = {(r['學校代號'].zfill(3), key(r['115系名'])) for r in read_csv(a.year_map)}
        sug = [x for x in suggest(data, old) if (x['學校代號'], key(x['115系名'])) not in listed]
        write_csv(rv/'year_map_suggest.csv', sug, ['學校代號','學校名稱','115系名','114系名','關係','確認狀態','依據','特殊專案組'])
        print('年度對應待確認：', len(sug), '筆 →', rv/'year_map_suggest.csv', dict(collections.Counter(x['關係'] for x in sug)))
