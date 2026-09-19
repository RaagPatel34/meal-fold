"""Validate imported snapshots against independently checked source rows."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
rows=json.loads((root/'data/imported-menu.json').read_text())['foods']+json.loads((root/'data/curated-menu.json').read_text())
assert len({r['id'] for r in rows})==len(rows)
for r in rows:
    assert r['quality'] in ['published','estimate','custom']
    assert r['source'].startswith('https://') and r['note']
    assert len(r['id'])<=100 and len(r['name'])<=160 and len(r['serving'])<=160 and len(r['category'])<=80
    for k in ['calories','protein','carbs','fat']: assert isinstance(r[k],(int,float)) and 0<=r[k]<=20000

def check(restaurant,name,expected,quality='published'):
    r=next(r for r in rows if r['restaurant']==restaurant and r['name']==name)
    assert tuple(r[k] for k in ['calories','protein','carbs','fat'])==expected,(name,r)
    assert r['quality']==quality
check('leaves','House Coffee - Iced 20 oz',(330,2,34,22))
check('leaves','Honey Boba',(30,0,7,0),'estimate')
check('bean','16 oz Café Latte',(290,14,24,16))
check('bean','16 oz Iced Matcha Tea Latte',(240,11,40,4.5))
check('inout','Double-Double · Protein Style',(460,30,12,32))
check('chipotle','Chicken',(180,32,0,7))
check('starbucks','Iced Caramel Macchiato',(250,10,37,7),'estimate')
print(f'PASS: {len(rows)} expanded catalog entries, unique IDs, API limits and source-row regression checks.')
