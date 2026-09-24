'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Star,Plus,Trash2,Target} from 'lucide-react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {totals,round,type Meal,type Macros} from '@/lib/menu';
import {macroKeys,macroLabels,summarizeWeek,type Goals} from '@/lib/tracking';

export function useTracking(){
 const [goals,setGoals]=useState<Goals>({}),[favorites,setFavorites]=useState<Meal[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),sequence=useRef(0);
 const reload=useCallback(async()=>{const id=++sequence.current;setReady(false);setError('');try{
  const res=await fetch('/api/tracking');const data=await res.json() as {error?:string;goals:Goals;favorites:Meal[]};if(id!==sequence.current)return;
  if(!res.ok)throw new Error(data.error||'Could not load goals and favorites.');setGoals(data.goals);setFavorites(data.favorites);setReady(true);
 }catch(e){if(id===sequence.current)setError(e instanceof Error?e.message:'Could not load goals and favorites.')}},[]);
 useEffect(()=>{void reload();return()=>{sequence.current++}},[reload]);
 async function mutate(method:string,body?:unknown,id?:string){
  if(lock.current||!ready)return false;lock.current=true;setBusy(true);
  try{const response=await fetch('/api/tracking'+(id?'?id='+encodeURIComponent(id):''),{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json() as {error?:string;goals:Goals;favorite:Meal};if(!response.ok)throw new Error(data.error||'Could not save your changes.');
   if(method==='PUT')setGoals(data.goals);
   if(method==='POST')setFavorites(old=>[data.favorite,...old.filter(m=>m.id!==data.favorite.id)]);
   if(method==='DELETE')setFavorites(old=>old.filter(m=>m.id!==id));return true;
  }catch(e){toast.error(e instanceof Error?e.message:'Could not save your changes.');return false}finally{lock.current=false;setBusy(false)}
 }
 return {goals,favorites,ready,error,busy,reload,
  saveGoals:async(g:Goals)=>{const ok=await mutate('PUT',g);if(ok)toast.success('Daily goals saved.');return ok},
  addFavorite:async(m:Meal)=>{const ok=await mutate('POST',m);if(ok)toast.success('Meal saved to favorites.');return ok},
  removeFavorite:async(id:string)=>{const ok=await mutate('DELETE',undefined,id);if(ok)toast.success('Removed from favorites. Your food log is unchanged.');return ok},
 };
}
export type Tracking=ReturnType<typeof useTracking>;
export function GoalProgress({tracking,value,loading,error,date,estimated}:{tracking:Tracking;value:Macros;loading:boolean;error:string;date:string;estimated:boolean}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<Record<string,string>>({});
 function edit(){setDraft(Object.fromEntries(macroKeys.map(k=>[k,tracking.goals[k]?.toString()??''])));setOpen(true)}
 return <section className="goal-panel" aria-label="Daily goals"><div className="goal-heading"><div><h2>Your daily progress</h2><p>{date||'Choose a date'} · Logged meals only{estimated?' · Includes estimates':''}</p></div><button className="text-button" disabled={!tracking.ready||tracking.busy} onClick={edit}><Target size={16}/>{Object.keys(tracking.goals).length?'Edit goals':'Set daily goals'}</button></div>
 {tracking.error&&<p className="tracking-error">{tracking.error} <button className="text-button" onClick={tracking.reload}>Try again</button></p>}
 <div className="goal-grid">{macroKeys.map(k=>{const goal=tracking.goals[k],unit=k==='calories'?'cal':'g',amount=round(value[k]),pending=loading||!!error;return <div className={'goal-card '+k} key={k}><span>{macroLabels[k]}</span><strong>{pending?'—':amount.toLocaleString()} <small>{unit}</small></strong>{goal?<><div className="goal-track" role="progressbar" aria-label={macroLabels[k]+' goal progress'} aria-valuemin={0} aria-valuemax={goal} {...(!pending?{'aria-valuenow':Math.min(amount,goal),'aria-valuetext':`${amount} of ${goal} ${unit}`}:{})}><span style={{width:pending?'0%':Math.min(100,amount/goal*100)+'%'}}/></div><p>{pending?'Waiting for your log':amount>goal?`${round(amount-goal)} ${unit} above goal`:`${round(goal-amount)} ${unit} remaining`}<br/><span>Goal: {goal} {unit}</span></p></>:<p>{tracking.error?'Goals unavailable':tracking.ready?'No goal set':'Loading goals…'}</p>}</div>})}</div>
 <Dialog open={open} onOpenChange={o=>{if(!tracking.busy)setOpen(o)}}><DialogContent><DialogHeader><DialogTitle>Your daily goals</DialogTitle><DialogDescription>Enter your own targets. Leave a field blank to track it without a goal.</DialogDescription></DialogHeader><form onSubmit={async e=>{e.preventDefault();const goals:Goals={};for(const k of macroKeys){if(draft[k]?.trim()){const n=Number(draft[k]);if(!Number.isFinite(n)||n<=0||n>20000)return;goals[k]=n}}if(await tracking.saveGoals(goals))setOpen(false)}}><div className="nutrition-inputs">{macroKeys.map(k=><label className="field" key={k}>{macroLabels[k]} ({k==='calories'?'cal':'g'})<input type="number" min="0.1" max="20000" step="0.1" placeholder="Not set" value={draft[k]??''} onChange={e=>setDraft({...draft,[k]:e.target.value})}/></label>)}</div><p className="tracking-caption">Saved with your food log on this computer. These are your targets, not calculated recommendations.</p><button className="primary-button" disabled={tracking.busy}>{tracking.busy?'Saving…':'Save goals'}</button></form></DialogContent></Dialog></section>;
}
export function FavoriteButton({meal,tracking}:{meal:Meal;tracking:Tracking}){
 const saved=tracking.favorites.some(f=>f.id===meal.id);
 return <button aria-label={(saved?'Unfavorite ':'Favorite ')+meal.name} aria-pressed={saved} disabled={!tracking.ready||tracking.busy} onClick={()=>saved?tracking.removeFavorite(meal.id):tracking.addFavorite(meal)}><Star size={17} fill={saved?'currentColor':'none'}/></button>;
}
export function Favorites({tracking,onReuse}:{tracking:Tracking;onReuse:(m:Meal)=>void}){
 if(tracking.error)return <div className="inline-empty">{tracking.error}<button className="text-button" onClick={tracking.reload}>Try again</button></div>;
 if(!tracking.ready)return <p className="inline-empty">Loading favorites…</p>;
 return <><p className="inline-note">Your saved orders, including custom portions. Add one to your meal, review it, then log it.</p>{tracking.favorites.length?tracking.favorites.map(m=><div className="recent-row" key={m.id}><div><h3>{m.name}</h3><p>{m.items.length} items · {Math.round(totals(m.items).calories)} cal{m.items.some(i=>i.quality!=='published')?' · Includes estimates':''}</p></div><div className="favorite-actions"><button className="text-button" onClick={()=>onReuse(m)}><Plus size={16}/> Add</button><button className="text-button" disabled={tracking.busy} aria-label={'Remove favorite '+m.name} onClick={()=>tracking.removeFavorite(m.id)}><Trash2 size={16}/></button></div></div>):<div className="inline-empty"><Star size={26}/><h3>Keep your usual orders here.</h3><p>Tap the star on a logged meal, or save the meal you’re building.</p></div>}</>;
}
export function WeeklyProgress({date,meals,goals,loading,error,onDate}:{date:string;meals:Meal[];goals:Goals;loading:boolean;error:string;onDate:(date:string)=>void}){
 const [metric,setMetric]=useState<keyof Macros>('calories');const days=summarizeWeek(date,meals),logged=days.filter(d=>d.meals>0),max=Math.max(1,goals[metric]||0,...days.map(d=>d.totals[metric]));const unit=metric==='calories'?'cal':'g';
 return <section className="week-panel" aria-label="Weekly progress"><div className="goal-heading"><div><h2>Your week</h2><p>{days[0]?.date} – {days[6]?.date}</p></div><label className="week-select">Show<select aria-label="Weekly nutrient" value={metric} onChange={e=>setMetric(e.target.value as keyof Macros)}>{macroKeys.map(k=><option value={k} key={k}>{macroLabels[k]}</option>)}</select></label></div>
 {error?<p className="tracking-error">Your week is unavailable until your food log loads.</p>:loading?<p className="inline-empty">Loading your week…</p>:<><div className="week-chart">{days.map(d=><button className={'week-day '+(d.date===date?'selected':'')} key={d.date} aria-pressed={d.date===date} aria-label={`${d.date}: ${d.meals?`${round(d.totals[metric])} ${unit}, ${d.meals} meals${d.estimated?', includes estimates':''}`:'no meals logged'}`} onClick={()=>onDate(d.date)}><strong>{d.meals?`${d.estimated?'~':''}${Math.round(d.totals[metric])}`:'—'}</strong><span className="week-column">{goals[metric]&&<span className="week-goal" style={{bottom:goals[metric]!/max*100+'%'}}/>}<span className="week-bar" style={{height:d.meals?Math.max(2,d.totals[metric]/max*100)+'%':'0%'}}/></span><span>{new Date(d.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'})}</span><small>{d.date.slice(5)}</small></button>)}</div><div className="week-summary"><span><strong>{logged.length}/7</strong> days with meals logged</span><span>{logged.length?<><strong>{round(logged.reduce((a,d)=>a+d.totals[metric],0)/logged.length)}</strong> {unit} average per logged day</>:'Log a meal to start your weekly view.'}</span>{goals[metric]&&<span>Dashed line: current goal of {goals[metric]} {unit}</span>}</div><p className="tracking-caption">Missing days are not counted as zero intake. Tap a day to open its log.</p></>}
 </section>;
}
