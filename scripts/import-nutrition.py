"""Import public 7 Leaves HTML and Coffee Bean PDF tables; no login or live app dependency.
Run: python3 -m pip install -r scripts/requirements-nutrition.txt
     python3 scripts/import-nutrition.py [--cached]
Downloads stay in ignored work/. Validated snapshots replace data/imported-menu.json atomically.
"""
import argparse, datetime, hashlib, io, json, re, urllib.request
from pathlib import Path
import pdfplumber
ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'leaves': ('https://7leavescafe.com/nutrition-facts', 'seven-leaves.html'),
    'bean': ('https://cdn.shopify.com/s/files/1/0462/8021/2633/files/CBTL_Nutrition.pdf?v=1744407185', 'coffeebean.pdf'),
}
KEYS = {'calories': 'Calories', 'fat': 'Total Fat (g)', 'carbs': 'Total Carbohydrate (g)', 'protein': 'Protein (g)'}
def clean(s): return ' '.join((s or '').split())
def number(s):
    s=clean(s)
    if not re.fullmatch(r'\d+(?:\.\d+)?', s): raise ValueError(f'Unexpected nutrition value: {s!r}')
    return float(s)
def entry(restaurant, name, serving, category, macros, note, quality='published'):
    return dict(id=restaurant+'-'+hashlib.sha256(name.encode()).hexdigest()[:14],restaurant=restaurant,name=name,serving=serving,category=category,**macros,quality=quality,source=SOURCES[restaurant][0],note=note)
def parse_leaves(content, checked):
    match=re.search(r'<script\s+id="anMenuData"\s+type="application/json">(.*?)</script>',content.decode(),re.S)
    if not match: raise ValueError('7 Leaves page format changed; previous catalog kept.')
    data=json.loads(match[1]); rows=[]
    for category, foods in data['groups'].items():
        for f in foods:
            missing=[k for k,v in KEYS.items() if not clean(f['nutrition'].get(v))]
            # Never invent calories; missing macro cells are visible assumptions.
            if 'calories' in missing: raise ValueError('Missing calories: '+f['name'])
            macros={k:number(f['nutrition'][v]) if k not in missing else 0 for k,v in KEYS.items()}
            size=re.search(r'\d+(?:\.\d+)?\s*oz',f['name'])
            note=f'Official 7 Leaves nutrition table, retrieved {checked}. Standard recipe. Page lists menu data dated 6/15/26 and nutrition last reviewed 1/1/19.'
            if missing: note+=' Source leaves '+', '.join(missing)+' blank; assumed 0 g for tracking. This is an estimate, not a published zero.'
            if not size: note+=' Source does not specify a weight or volume for this portion; confirm your add-on amount.'
            rows.append(entry('leaves',clean(f['name']),size[0]+' · standard recipe' if size else '1 listed portion · size unspecified',category,macros,note,'estimate' if missing or not size else 'published'))
    if len(rows)<50: raise ValueError('7 Leaves import unexpectedly small; previous catalog kept.')
    return rows

def parse_bean(content, checked):
    rows=[];category='Coffee'
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page_index,page in enumerate(pdf.pages):
            tables=page.extract_tables()
            if not tables: raise ValueError(f'Coffee Bean table missing on page {page_index+1}')
            for table in tables:
                if not table or clean(table[0][1])!='Calories': raise ValueError('Coffee Bean column layout changed')
                for row in table[1:]:
                    name=clean(row[0])
                    if not name or clean(row[1])=='Calories': continue
                    if not clean(row[1]):
                        if any(clean(v) for v in row[2:]): raise ValueError('Partially empty nutrition row: '+name)
                        if 'powder' not in name.lower() and 'mango ice blended' != name.lower(): category=name.title()
                        continue
                    if len(row)!=17: raise ValueError('Coffee Bean column count changed')
                    macros={k:number(row[i]) for k,i in [('calories',1),('fat',2),('carbs',7),('protein',11)]}
                    if any(word in name.lower() for word in ['powder', 'swirl', 'half & half', 'cream cap']): item_category='Add-ons'
                    else: item_category=category
                    size=re.search(r'(?:\d+(?:/\d+|\.\d+)?)\s*(?:fl\s*)?(?:oz|cup)',name,re.I)
                    serving=(size[0] if size else '1 listed serving')+' · standard recipe'
                    note=f'Official US Coffee Bean & Tea Leaf nutrition PDF, page {page_index+1}, retrieved {checked}. Standard recipe and listed size; milk swaps, sweetness changes and toppings require an estimate. This PDF includes older and seasonal recipes; availability varies.'
                    rows.append(entry('bean',name,serving,item_category,macros,note))
    if len(rows)<100: raise ValueError('Coffee Bean import unexpectedly small; previous catalog kept.')
    return rows

def main():
    args=argparse.ArgumentParser();args.add_argument('--cached',action='store_true');opts=args.parse_args()
    checked=datetime.date.today().isoformat();all_rows=[];source_records=[]
    (ROOT/'work').mkdir(exist_ok=True)
    for restaurant,(url,filename) in SOURCES.items():
        path=ROOT/'work'/filename
        if opts.cached: content=path.read_bytes()
        else:
            req=urllib.request.Request(url,headers={'User-Agent':'MealFold nutrition importer (personal use)'})
            with urllib.request.urlopen(req,timeout=45) as response: content=response.read(20_000_000)
            path.write_bytes(content)
        rows=(parse_leaves if restaurant=='leaves' else parse_bean)(content,checked)
        all_rows.extend(rows);source_records.append(dict(restaurant=restaurant,url=url,retrieved=checked,sha256=hashlib.sha256(content).hexdigest(),count=len(rows)))
    unique={}
    for row in all_rows:
        if row['id'] in unique and row != unique[row['id']]:
            raise ValueError('Conflicting duplicate nutrition; previous catalog kept.')
        unique[row['id']]=row
    all_rows=list(unique.values())
    for record in source_records:
        record['count']=sum(r['restaurant']==record['restaurant'] for r in all_rows)
    ids=[r['id'] for r in all_rows]
    if len(ids)!=len(set(ids)): raise ValueError('Duplicate items; previous catalog kept.')
    for r in all_rows:
        if any(not 0<=r[k]<=20000 for k in KEYS): raise ValueError('Invalid macros')
        if len(r['name'])>160 or len(r['category'])>80: raise ValueError('Item exceeds application limits')
    target=ROOT/'data'/'imported-menu.json';temp=target.with_suffix('.tmp')
    temp.write_text(json.dumps({'sources':source_records,'foods':all_rows},ensure_ascii=False,indent=2)+'\n');temp.replace(target)
    for s in source_records: print(f"Imported {s['count']} {s['restaurant']} items")
if __name__=='__main__': main()
