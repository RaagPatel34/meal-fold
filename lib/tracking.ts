import type {Meal,Macros} from './menu';
export type Goals=Partial<Macros>;
export const macroKeys=['calories','protein','carbs','fat'] as const;
export const macroLabels={calories:'Calories',protein:'Protein',carbs:'Carbs',fat:'Fat'};
/** Calendar arithmetic uses UTC only on date-only values, avoiding DST offsets. */
export function weekDates(date:string):string[]{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return [];
 const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)return [];
 d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
 return Array.from({length:7},(_,i)=>{const day=new Date(d);day.setUTCDate(d.getUTCDate()+i);return day.toISOString().slice(0,10)});
}
export function summarizeWeek(date:string,meals:Meal[]){return weekDates(date).map(day=>{
 const entries=meals.filter(m=>m.date===day);
 const totals=entries.flatMap(m=>m.items).reduce((a,i)=>({calories:a.calories+i.calories*i.quantity,protein:a.protein+i.protein*i.quantity,carbs:a.carbs+i.carbs*i.quantity,fat:a.fat+i.fat*i.quantity}),{calories:0,protein:0,carbs:0,fat:0});
 return {date:day,meals:entries.length,estimated:entries.some(m=>m.items.some(i=>i.quality!=='published')),totals};
});}
