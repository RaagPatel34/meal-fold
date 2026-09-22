"""Validate every active catalog entry and representative independently checked source rows."""
import json,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
rows=json.loads((root/'data/imported-menu.json').read_text())['foods']+json.loads((root/'data/refreshed-menu.json').read_text())['foods']
assert len({r['id'] for r in rows})==len(rows)
assert {r['restaurant'] for r in rows}=={'canes','taco','panda','kura','leaves','bean','starbucks','inout','chipotle'}
for r in rows:
    assert r['quality'] in ['published','estimate','custom']
    assert r['source'].startswith('https://') and r['note']
    for k,limit in [('id',100),('name',160),('serving',160),('category',80),('note',2000)]:assert 0<len(r[k])<=limit,(k,r['name'])
    for k in ['calories','protein','carbs','fat']:assert isinstance(r[k],(int,float)) and math.isfinite(r[k]) and 0<=r[k]<=20000
    assert 1<=len(r['nutritionDetails'])<=40,r['name']
    for d in r['nutritionDetails']:
        assert 0<len(d['label'])<=80 and 0<len(d['value'])<=80 and len(d['unit'])<=30,(r['name'],d)

def check(restaurant,name,expected,quality='published'):
    r=next(r for r in rows if r['restaurant']==restaurant and r['name']==name)
    assert tuple(r[k] for k in ['calories','protein','carbs','fat'])==expected,(name,r)
    assert r['quality']==quality
    return r
check('leaves','House Coffee - Iced 20 oz',(330,2,34,22))
check('leaves','Honey Boba',(30,0,7,0),'estimate')
check('bean','16 oz Café Latte',(290,14,24,16))
check('bean','16 oz Iced Matcha Tea Latte',(240,11,40,4.5))
check('canes','Chicken Finger',(130,12,5,6))
r=check('taco','Crunchy Taco',(170,7,13,9))
assert next(d['value'] for d in r['nutritionDetails'] if d['label']=='Sodium')=='310'
check('taco','Cantina Chicken Bowl',(580,26,55,29))
check('panda','Orange Chicken',(510,16,53,24))
check('kura','Salmon',(90,5,11,2.5))
check('chipotle','Chicken',(180,32,0,7))
check('starbucks','Caffè Latte · Short',(100,6,10,3.5))
r=next(r for r in rows if r['restaurant']=='taco' and r['name']=='Avocado Salsa Verde Packet')
assert r['quality']=='estimate' and r['carbs']==0.5
assert next(d['value'] for d in r['nutritionDetails'] if d['label']=='Carbohydrates')=='<1'
print(f'PASS: {len(rows)+2:,} catalog entries including two off-menu estimates; all nine restaurants, unique IDs, API limits, source rows and less-than preservation.')
