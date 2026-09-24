// Exercise the real handlers against SQLite without touching anyone's food log.
const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync('scripts/init-local.sql','utf8'));
let user={userId:'alice'};
const database={prepare(sql){return {bind(...params){return {sql,params,run:async()=>sqlite.prepare(sql).run(...params)}}}},async batch(statements){return statements.map(s=>({results:sqlite.prepare(s.sql).all(...s.params)}))}};
const cache={};
function load(file){if(cache[file])return cache[file];const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const req=name=>name==='@/app/chatgpt-auth'?{getChatGPTUser:async()=>user}:name==='@/db/raw'?{database:()=>database}:name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name);
 new Function('require','module','exports',js)(req,module,module.exports);return cache[file]=module.exports;
}
const tracking=load('app/api/tracking/route.ts'),meals=load('app/api/meals/route.ts'),dates=load('lib/tracking.ts');
const req=(method,path,body,origin='http://localhost:5173')=>new Request('http://localhost:5173'+path,{method,headers:{origin,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
const food={id:'finger',lineId:'line',restaurant:'canes',name:'Chicken finger',serving:'1 finger',category:'Chicken',quality:'published',source:'https://example.com',note:'Test fixture',calories:130,protein:12,carbs:5,fat:6,quantity:0.5,nutritionDetails:[{label:'Sodium',value:'230',unit:'mg'}]};
const meal={id:'f9e3e45c-39f3-40d6-a00c-33132e000001',name:'My usual',date:'2026-09-24',period:'Lunch',items:[food]};
(async()=>{
 assert.deepEqual(dates.weekDates('2026-01-01'),['2025-12-29','2025-12-30','2025-12-31','2026-01-01','2026-01-02','2026-01-03','2026-01-04']);
 assert.equal(dates.weekDates('2026-03-08')[0],'2026-03-02');assert.equal(dates.weekDates('2026-02-30').length,0);
 const week=dates.summarizeWeek(meal.date,[meal]);assert.equal(week[3].totals.calories,65);assert.equal(week.filter(d=>d.meals).length,1);
 assert.equal((await tracking.POST(req('POST','/api/tracking',meal))).status,200);
 assert.equal((await tracking.POST(req('POST','/api/tracking',{...meal,name:'Updated favorite'}))).status,200);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM favorite_meals').get().n,1);assert.equal(sqlite.prepare('SELECT count(*) n FROM meals').get().n,0);
 assert.equal((await tracking.PUT(req('PUT','/api/tracking',{calories:2200,protein:120}))).status,200);
 let data=await (await tracking.GET(req('GET','/api/tracking'))).json();assert.equal(data.goals.protein,120);assert.equal(data.favorites[0].items[0].quantity,0.5);assert.equal(data.favorites[0].items[0].nutritionDetails[0].value,'230');
 assert.equal((await tracking.PUT(req('PUT','/api/tracking',{calories:0}))).status,400);
 assert.equal((await tracking.PUT(req('PUT','/api/tracking',{protein:12},'https://untrusted.example'))).status,403);
 assert.equal((await meals.POST(req('POST','/api/meals',meal))).status,201);
 const next={...meal,id:'f9e3e45c-39f3-40d6-a00c-33132e000002',date:'2026-09-21'};await meals.POST(req('POST','/api/meals',next));
 const outside={...meal,id:'f9e3e45c-39f3-40d6-a00c-33132e000003',date:'2026-09-20'};await meals.POST(req('POST','/api/meals',outside));
 data=await (await meals.GET(req('GET','/api/meals?date=2026-09-24'))).json();assert.equal(data.meals.length,1);assert.equal(data.week.length,2);
 user={userId:'bob'};data=await (await tracking.GET(req('GET','/api/tracking'))).json();assert.deepEqual(data.favorites,[]);assert.deepEqual(data.goals,{});
 await tracking.DELETE(req('DELETE','/api/tracking?id='+meal.id));assert.equal(sqlite.prepare('SELECT count(*) n FROM favorite_meals').get().n,1);
 data=await (await meals.GET(req('GET','/api/meals?date=2026-09-24'))).json();assert.equal(data.week.length,0);
 user=null;assert.equal((await tracking.GET(req('GET','/api/tracking'))).status,401);
 user={userId:'alice'};assert.equal((await tracking.PUT(req('PUT','/api/tracking',{}))).status,200);await tracking.DELETE(req('DELETE','/api/tracking?id='+meal.id));assert.equal(sqlite.prepare('SELECT count(*) n FROM meals').get().n,3);
 const old={...food};delete old.nutritionDetails;assert.equal(load('lib/meal-schema.ts').mealSchema.safeParse({...meal,items:[old]}).success,true);
 console.log('PASS: goals, favorite snapshots/idempotency, clearing/removal, user isolation, auth/origin protection, week boundaries and existing meal compatibility.');
 sqlite.close();
})().catch(e=>{console.error(e);process.exitCode=1});
