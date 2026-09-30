import type {Food,Meal} from './menu';
export function shiftDate(value:string,days:number){
 const date=new Date(value+'T12:00:00Z');
 if(!Number.isFinite(date.getTime()))return value;
 date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);
}
export type MenuFilters={maxCalories:string;minProtein:string;publishedOnly:boolean;sort:string};
export function filterMenu(foods:Food[],filters:MenuFilters){
 const result=foods.filter(f=>(!filters.maxCalories||f.calories<=Number(filters.maxCalories))&&(!filters.minProtein||f.protein>=Number(filters.minProtein))&&(!filters.publishedOnly||f.quality==='published'));
 if(filters.sort==='calories')result.sort((a,b)=>a.calories-b.calories||a.name.localeCompare(b.name));
 if(filters.sort==='protein')result.sort((a,b)=>b.protein-a.protein||a.calories-b.calories);
 return result;
}
function csvCell(value:unknown){
 let text=String(value??'');
 // Spreadsheet apps must treat user-entered names as text, not formulas.
 if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
export function mealsCsv(meals:Meal[]){
 const rows:unknown[][]=[['Date','Meal','Meal type','Item','Restaurant ID','Serving','Quantity','Calories','Protein (g)','Carbs (g)','Fat (g)','Nutrition quality']];
 for(const meal of meals)for(const item of meal.items){const n=(v:number)=>Math.round(v*item.quantity*10)/10;rows.push([meal.date,meal.name,meal.period,item.name,item.restaurant,item.serving,item.quantity,n(item.calories),n(item.protein),n(item.carbs),n(item.fat),item.quality]);}
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
