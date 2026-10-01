"""Rebuild DQ and El Pollo Loco from official captures in ignored work/new-restaurants.
DQ captures: web-tool line text saved as dq-*.json. EPL: current official PDF text as epl.txt.
Run after updating captures; validation fails rather than replacing a partial snapshot.
"""
import json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'work/new-restaurants';DATE='2026-09-30'
URL={'dq':'https://www.dairyqueen.com/en-us/nutrition/food-treats/','pollo':'https://www.elpolloloco.com/content/pdfs/epl_web_nutrition_guide_mod_5_2026_hr-2.pdf'}
rows=[];excluded=[]
def add(rest,name,serving,category,v,extra=''):
 labels=['Calories','Calories from fat','Total fat','Saturated fat','Trans fat','Cholesterol','Sodium','Carbohydrates','Fiber','Sugar','Protein']
 units=['kcal','kcal','g','g','g','mg','mg','g','g','g','g']
 macros={k:float(v[i]) for k,i in [('calories',0),('fat',2),('carbs',7),('protein',10)]}
 item=dict(id=rest+'-'+hashlib.sha256((name+'|'+serving+'|'+str(v)).encode()).hexdigest()[:16],restaurant=rest,name=name,serving=serving,category=category,quality='published',source=URL[rest],note=f'Official US nutrition retrieved {DATE}. '+extra,**macros,nutritionDetails=[dict(label=l,value=x or 'Not published',unit=u if x else '') for l,x,u in zip(labels,v,units)])
 if not any(r['id']==item['id'] for r in rows):rows.append(item)
lines={}
for f in P.glob('dq-*.json'):
 for n,t in re.findall(r'L(\d+): (.*?)(?= L\d+:|\n|$)',json.loads(f.read_text())):lines[int(n)]=t
category='Menu';header=[]
for n,t in sorted(lines.items()):
 if t.startswith('### '):category=re.sub(r'\^\{[^}]*\}','',t[4:]).split('(See')[0].strip()
 c=[x.strip() for x in t.split('|')]
 while header and len(c)>len(header) and not c[-1]:c.pop()
 if c[0] in ['Menu Item','Supplemental Facts']:
  header=c;continue
 if not header or len(c)!=len(header) or not re.fullmatch(r'\d+(?:\.\d+)?',c[1]):continue
 if 'Parmesan Garlic' in c[0] and '4 Piece' in c[0]:excluded.append(c[0]+' — official row has shifted/inconsistent nutrient cells');continue
 if header[0]!='Menu Item':continue
 v=c[1:12]
 if not all(re.fullmatch(r'\d+(?:\.\d+)?',v[i]) for i in [0,2,7,10]):excluded.append(c[0]+' — missing macros');continue
 name=c[0];size=re.search(r'(?:Mini|Small|Medium|Large|Regular|Kids\x27|\d+ (?:pc|Piece))',name,re.I)
 add('dq',name,('Whole listed cake · not a slice' if 'cake' in category.lower() and float(v[0])>2000 else '1 '+(size[0].lower()+' ' if size else '')+'listed menu serving'),category,v,'Standard recipe and size; US table excludes Texas food menus and some location-specific recipes. Baskets exclude drinks. Availability varies; choose your exact size.')
category='Menu';drink=''
for t in (P/'epl.txt').read_text().splitlines():
 m=re.fullmatch(r'(.*?) ((?:\d+(?:\.\d+)?\s+){11}\d+(?:\.\d+)?)(?:\s+[X ]+)?',t)
 if m:
  name=m[1];values=m[2].split();v=values[1:]
  if category.startswith('Drinks'):
   if name=='Large':name=drink+' Large'
   elif name.endswith('Regular'):drink=name[:-len('Regular')].strip()
  add('pollo',name,values[0]+' oz · listed portion',category,v,'September 2026 guide. Standard recipe. '+('Dressing excluded; add dressing separately. ' if '*' in name and '**' not in name else '')+('Entrée only; add sides and drinks separately. ' if ('Entree' in category or 'Entrée' in category) else '')+'Meals explicitly naming sides include those sides. Availability varies.')
 elif t.split('(')[0].strip().isupper() and len(t)<80 and not any(x in t for x in ['NUTRITION','ALLERGEN']):category=t.title()
assert sum(r['restaurant']=='dq' for r in rows)>200
assert sum(r['restaurant']=='pollo' for r in rows)>70
for r in rows:
 for k in ['calories','protein','carbs','fat']:assert 0<=r[k]<=20000
 for k,limit in [('name',160),('category',80),('serving',160)]:assert len(r[k])<=limit,(k,r[k])
Path(ROOT/'data/new-restaurants.json').write_text(json.dumps(dict(retrieved=DATE,sources=URL,excluded=excluded,foods=rows),ensure_ascii=False,indent=2)+'\n')
for rest in URL:print(rest,sum(r['restaurant']==rest for r in rows))
print('Excluded:',excluded)
