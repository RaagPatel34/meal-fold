'use client';
import {useRef,useState} from 'react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {totals,round,type Meal} from '@/lib/menu';

export function ExportLog(){
 const [busy,setBusy]=useState(false);const lock=useRef(false);
 async function download(){if(lock.current)return;lock.current=true;setBusy(true);try{
  const response=await fetch('/api/export');
  if(!response.ok){const data=await response.json() as {error?:string};throw new Error(data.error||'Export failed.')}
  const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='meal-fold-food-log.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  toast.success('Your full food log was exported.');
 }catch(e){toast.error(e instanceof Error?e.message:'Export failed. Please try again.')}finally{lock.current=false;setBusy(false)}}
 return <button className="secondary-button" disabled={busy} onClick={download}>{busy?'Exporting…':'Export full log (CSV)'}</button>;
}
export function EditLoggedMeal({meal,onClose,onSaved}:{meal:Meal;onClose:()=>void;onSaved:()=>void|Promise<void>}){
 const [draft,setDraft]=useState<Meal>(()=>({...meal,items:meal.items.map(i=>({...i}))}));
 const [busy,setBusy]=useState(false);const lock=useRef(false);const total=totals(draft.items);
 async function save(e:React.FormEvent){e.preventDefault();if(lock.current||!draft.items.length)return;lock.current=true;setBusy(true);try{
  const response=await fetch('/api/meals',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,name:draft.name.trim()})});
  const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Could not save your edits.');
  toast.success('Meal updated. Your totals have been recalculated.');await onSaved();onClose();
 }catch(e){toast.error(e instanceof Error?e.message:'Your edits could not save.')}finally{lock.current=false;setBusy(false)}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="saved-meal-editor"><DialogHeader><DialogTitle>Edit logged meal</DialogTitle><DialogDescription>Correct the date, meal type, or portions. Nutrition values are per serving; changing them marks that item as your estimate.</DialogDescription></DialogHeader><form onSubmit={save}><fieldset disabled={busy} className="edit-fields"><label className="field">Meal name<input required maxLength={160} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><div className="saved-meal-meta"><label className="field">Date<input required type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label className="field">Meal type<select value={draft.period} onChange={e=>setDraft({...draft,period:e.target.value})}>{['Breakfast','Lunch','Dinner','Snack'].map(p=><option key={p}>{p}</option>)}</select></label></div>
 {draft.items.map((item,index)=><section className="saved-item" key={item.lineId}><div className="saved-item-heading"><div><strong>{item.name}</strong><p>{item.serving}</p></div><button type="button" className="text-button" disabled={draft.items.length===1} aria-label={'Remove '+item.name+' from saved meal'} onClick={()=>setDraft({...draft,items:draft.items.filter((_,i)=>i!==index)})}>Remove</button></div><label className="field">Servings<input required type="number" min="0.1" max="100" step="0.1" value={item.quantity} onChange={e=>setDraft({...draft,items:draft.items.map((v,i)=>i===index?{...v,quantity:e.target.value===''?'' as unknown as number:Number(e.target.value)}:v)})}/></label><details><summary>Correct nutrition per serving</summary><div className="nutrition-inputs">{(['calories','protein','carbs','fat'] as const).map(k=><label className="field" key={k}>{k==='calories'?'Calories':k[0].toUpperCase()+k.slice(1)+' (g)'}<input required type="number" min="0" max="20000" step="0.1" value={item[k]} onChange={e=>setDraft({...draft,items:draft.items.map((v,i)=>i===index?{...v,[k]:e.target.value===''?'':Number(e.target.value),quality:'custom',nutritionDetails:undefined}:v)})}/></label>)}</div></details></section>)}
 <p className="edit-total" aria-live="polite">{round(total.calories)} cal · {round(total.protein)}g protein · {round(total.carbs)}g carbs · {round(total.fat)}g fat</p><button className="primary-button" type="submit" disabled={!draft.name.trim()}>{busy?'Saving…':'Save changes'}</button><button className="copy-button" type="button" onClick={onClose}>Cancel</button></fieldset></form></DialogContent></Dialog>;
}
