"""Rebuild seven restaurant snapshots from public source captures in work/nutrition-refresh.
Captures are deliberately separate from parsing: a blocked fetch never erases the catalog.
See README for source URLs and capture requirements. Requires pdfplumber.
"""
import json,re,hashlib,datetime,os
from pathlib import Path
import pdfplumber
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'work/nutrition-refresh';DATE='2026-09-21'
URLS={'taco':'https://www.nutritionix.com/taco-bell/menu/premium','panda':'https://www.pandaexpress.com/nutritioninformation','kura':'https://kurasushi.com/menu/nutrition','canes':'https://raisingcanes.cdn.prismic.io/raisingcanes/IxTKraMRo_HyNWx2_Allergen%26NutritionalInformation_ALL_DIGITAL_8.26.pdf','chipotle':'https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf','inout':'https://www.in-n-out.com/docs/default-source/downloads/nutrition_info.pdf?sfvrsn=332aab37_18','starbucks':'https://www.starbucks.com/menu'}
def clean(x):return ' '.join(str('' if x is None else x).split())
def raw(x):
 s=clean(x).replace(',','');m=re.fullmatch(r'(<\s*)?(\d+(?:\.\d+)?)(?:\s*(?:g|mg))?',s)
 if not m:raise ValueError('Invalid number '+repr(s))
 return ('<' if m[1] else '')+m[2]
def num(x):
 s=raw(x);return float(s[1:])/2 if s.startswith('<') else float(s)
def details(values,labels):return [dict(label=l,value=raw(v),unit=u) for v,(l,u) in zip(values,labels)]
LABELS=[('Calories','kcal'),('Total fat','g'),('Saturated fat','g'),('Trans fat','g'),('Cholesterol','mg'),('Sodium','mg'),('Carbohydrates','g'),('Fiber','g'),('Sugar','g'),('Protein','g')]
rows=[]
def add(rest,name,serving,category,values,note='',extra=None,source=None):
 assert len(values)==10,(name,values)
 macro={k:num(values[i]) for k,i in [('calories',0),('fat',1),('carbs',6),('protein',9)]}
 approximate=any(raw(values[i]).startswith('<') for i in [0,1,6,9])
 if approximate:note+=' A published less-than value is tracked at half its upper bound (for example, <1 g becomes 0.5 g); original values appear below.'
 item=dict(id=rest+'-'+hashlib.sha256((name+'|'+serving+'|'+str(values)).encode()).hexdigest()[:16],restaurant=rest,name=clean(name),serving=clean(serving),category=clean(category),quality='estimate' if approximate else 'published',source=source or URLS[rest],note=f'Official nutrition source checked {DATE}. '+note,**macro,nutritionDetails=details(values,LABELS)+(extra or []))
 rows.append(item)
def web_lines(prefix):
 lines={}
 for f in list(P.glob(prefix+'-*.json'))+list(P.glob('research-*.json')):
  data=json.loads(f.read_text())
  if not isinstance(data,str) or URLS[prefix] not in data:continue
  for n,t in re.findall(r'L(\d+)(?:@P\d+)?: (.*?)(?= L\d+(?:@P\d+)?:|\n|$)',data):lines[int(n)]=t
 return sorted(lines.items())
def trailing(s):
 m=re.search(r'(<\s*)?\d+(?:\.\d+)?\s*$',s)
 if not m:raise ValueError(s)
 return m[0]
def parse_web(rest):
 cat='Menu'
 for n,line in web_lines(rest):
  if line.startswith('##'):cat=line.lstrip('# ').title();continue
  c=[clean(x) for x in line.split('|')]
  if len(c)<13 or not re.search(r'Calories\s+\d',c[2 if rest=='panda' else 1]):continue
  name=re.sub(r'\ue200cite\ue202\d+†([^\ue201]+)\ue201',r'\1',c[0])
  if rest=='panda':
   v=[trailing(c[i]) for i in [2,4,5,6,7,8,9,10,11,12]]
   add(rest,name.title(),trailing(c[1])+' oz · listed portion',cat,v,'Standard listed portion; availability and regional recipes vary.',details([trailing(c[3])],[('Calories from fat','kcal')]))
  else:
   assert len(c)==16,(n,len(c))
   v=[trailing(c[i]) for i in [1,3,4,5,8,9,11,12,13,15]]
   extra=details([trailing(c[i]) for i in [2,6,7,10,14]],[('Calories from fat','kcal'),('Polyunsaturated fat','g'),('Monounsaturated fat','g'),('Potassium','mg'),('Added sugar','g')])
   add(rest,name,'1 listed menu serving',cat,v,'Source lists nutrition per menu serving without a serving weight. Do not assume this means one piece unless the item name says so.',extra)
def parse_taco():
 for line in (P/'taco-table.txt').read_text().splitlines():
  cat,name,*v=line.split('|');assert len(v)==11
  cat=cat.split('Taco Bell is')[0].split('At participating locations')[0].strip()
  size=re.search(r'\((\d+ oz)\)',name)
  add('taco',name,size[1]+' · standard recipe' if size else '1 listed menu serving',cat.title(),v[:9]+[v[10]],'Taco Bell-linked Nutritionix table updated September 21, 2026. Regional, seasonal and Cantina items may not be available locally. Listed packet sides are separate unless included in the named recipe.',details([v[9]],[('Added sugar','g')]))
def parse_canes():
 with pdfplumber.open(P/'canes.pdf') as pdf:
  for page_i,page in enumerate(pdf.pages):
   lines=page.extract_text().splitlines();cat='Menu'
   for line in lines:
    if line.startswith('COMBOS'):cat='Combos'
    if line.startswith('DRINKS'):cat='Drinks'
    if line.startswith('CONDIMENTS'):cat='Condiments'
    normalized=re.sub(r'<\s*(\d+)(?:\s*(?:mg|g))?',r'<\1',line)
    m=re.match(r'^(.*?) ((?:\d+(?:\.\d+)? (?:oz \(\d+(?:\.\d+)? g\)|fl oz|gallon|Pack(?:et)? \(\d+(?:\.\d+)? g\)))|1 Combo|1/6 Wedge) ((?:[\d.<]+\s+){9}[\d.<]+)(?:\s+\S+)?$',normalized)
    if not m:continue
    name,serving,vals=m.groups();v=vals.split()
    add('canes',name,serving,('Combos' if 'Combo' in name else ('Condiments' if cat=='Condiments' else ('Drinks' if page_i>0 or cat=='Drinks' else 'Food & sides'))),v,'August 2026 nutrition sheet. Drinks are measured excluding ice. Combo figures use the exact listed combination; check the source before adding a separate drink.')
def parse_chipotle():
 with pdfplumber.open(P/'chipotle.pdf') as pdf:
  for pi,page in enumerate(pdf.pages[1:]):
   for ti,table in enumerate(page.extract_tables()):
    last_name=''
    # Some PDF cells span two rows; distribute each printed value to its own size.
    for ci,c in enumerate(table[1:],1):
     for j in range(2,13):
      parts=(c[j] or '').splitlines()
      if len(parts)==2:
       assert ci+1<len(table) and not table[ci+1][j]
       c[j]=parts[0];table[ci+1][j]=parts[1]
    for c in table[1:]:
     if len(c)!=13 or not re.fullmatch(r'\d+',clean(c[2])):continue
     name=clean(c[0]) or last_name;last_name=name;serving=clean(c[1]);cat="Kid's portions" if ti==1 else 'Ingredients & drinks'
     if ti==1:name+=' · Kid’s'
     add('chipotle',name,serving,cat,[c[i] for i in [2,4,5,6,7,8,9,10,11,12]],'Published full US nutrition PDF (file March 2025; chart marked October 2024). Includes adult and kid portions, plus regional beverage suppliers. Newer limited-time proteins and custom combinations are not covered by this sheet.',details([c[3]],[('Calories from fat','kcal')]))
def parse_inout():
 cat='Burgers';base='';drink=''
 for n,line in web_lines('inout'):
  if 2<=n<=18:
   parts=line.split(); vals=parts[-11:];prefix=' '.join(parts[:-11]);m=re.match(r'^(.*?) (\d+(?:oz\.)?)$',prefix);assert m,prefix
   name,size=m.groups()
   if name.startswith('with mustard'):name=base+' · Mustard & ketchup'
   elif name.startswith('ProteinStyle'):name=base+' · Protein Style'
   elif name=='with Marshmallows':name='Hot Cocoa · With marshmallows'
   else:base=name
   add('inout',name,size.replace('oz.',' fl oz') if 'oz' in size else size+' g','Burgers' if n<=10 else 'Sides & drinks',[vals[i] for i in [0,2,3,4,5,6,7,8,9,10]],'January 2026 US nutrition sheet. Standard preparation.',details([vals[1]],[('Calories from fat','kcal')]))
  elif 43<=n<=92:
   if not re.match(r'^(Sm|Med|Lg|X-Lg) ',line):
    if 'oz.' not in line and 'WITH' not in line.upper():drink=line
    continue
   c=line.split();assert len(c)==15,(n,c)
   for start,ice in [(1,'with ice'),(8,'without ice')]:
    size,cal,fat,sodium,carb,sugar,protein=c[start:start+7]
    add('inout',drink+' · '+c[0]+' · '+ice,size.replace('oz.',' fl oz')+' liquid · '+ice,'Drinks',[cal,fat,0,0,0,sodium,carb,0,sugar,protein],'January 2026 US nutrition sheet. Liquid volume excludes ice; cup size differs. Source explicitly lists unshown beverage nutrients as zero. Availability and water-supply sodium vary.')
def parse_starbucks():
 menu=json.loads((P/'starbucks-products.json').read_text());cats={}
 for f in menu:
  key=(f['productNumber'],f['formCode'].lower())
  if key not in cats or cats[key]=='Trending':cats[key]=f['category']
 skipped=[];count=0
 for file in sorted((P/'starbucks').glob('*.json')):
  for product in json.loads(file.read_text())['products']:
   for s in product.get('sizes',[]):
    n=s.get('nutrition');ident=f"{product['name']} · {s['name']}"
    if not n or n.get('calories',{}).get('displayValue') is None:skipped.append(ident);continue
    facts=n.get('additionalFacts',[]);f={x['id']:x for x in facts}
    needed=['totalFat','totalCarbs','protein']
    if any(k not in f or f[k].get('value') is None for k in needed):skipped.append(ident);continue
    allfacts=[x for item in facts for x in [item]+item.get('subfacts',[])];fm={x['id']:x for x in allfacts}
    required=['saturatedFat','transFat','cholesterol','sodium','dietaryFiber','sugars']
    # Do not fill unpublished secondary nutrients with invented zeros.
    if any(k not in fm or fm[k].get('value') is None for k in required):skipped.append(ident);continue
    v=[n['calories']['displayValue']]+[fm[k]['value'] for k in ['totalFat','saturatedFat','transFat','cholesterol','sodium','totalCarbs','dietaryFiber','sugars','protein']]
    extra=[dict(label=x['displayName'],value=str(x['value']),unit=x.get('unitOfMeasure','')) for x in allfacts if x['id'] not in needed+required and x.get('value') is not None]
    key=(product['productNumber'],product['formCode'].lower());source=f"https://www.starbucks.com/menu/product/{key[0]}/{key[1]}"
    add('starbucks',ident,clean(n.get('servingSize',{}).get('displayValue')) or '1 listed serving',cats.get(key,'Menu'),v,'Official US ordering menu, standard recipe for the named size. Milk, syrup, foam and other customizations change nutrition. Caffeine is approximate.',extra,source);count+=1
 (P/'starbucks-skipped.json').write_text(json.dumps(skipped,indent=2));print('Starbucks skipped without complete nutrition:',len(skipped))
def main():
 parse_taco();parse_web('panda');parse_web('kura');parse_canes();parse_chipotle();parse_inout();parse_starbucks()
 unique={}
 for r in rows:
  if r['id'] in unique:continue
  unique[r['id']]=r
 result=list(unique.values())
 counts={k:sum(r['restaurant']==k for r in result) for k in URLS}
 for k,minimum in dict(taco=500,panda=100,kura=100,canes=117,chipotle=60,inout=70,starbucks=400).items():assert counts[k]>=minimum,(k,counts[k])
 for r in result:
  assert 0<len(r['name'])<=160 and len(r['category'])<=80 and len(r['serving'])<=160,r['name']
  assert all(0<=r[k]<=20000 for k in ['calories','fat','protein','carbs']),r
 target=ROOT/'data/refreshed-menu.json';temporary=target.with_suffix(f'.{os.getpid()}.tmp')
 temporary.write_text(json.dumps({'checked':DATE,'counts':counts,'foods':result},ensure_ascii=False,indent=2)+'\n');temporary.replace(target)
 print(counts)
if __name__=='__main__':main()
