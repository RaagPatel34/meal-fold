import importedJson from '@/data/imported-menu.json?raw';
import refreshedJson from '@/data/refreshed-menu.json?raw';
import coverageData from '@/data/menu-coverage.json';
export const coverage=coverageData;
export type Macros={calories:number;protein:number;carbs:number;fat:number};
export type NutritionDetail={label:string;value:string;unit:string};
export type Food=Macros & {nutritionDetails?:NutritionDetail[];id:string;name:string;restaurant:string;serving:string;category:string;quality:'published'|'estimate'|'custom';source:string;note:string};
export type Line=Food & {quantity:number;lineId:string};
export type Meal={id:string;name:string;date:string;period:string;items:Line[];createdAt?:number};
export const restaurants=[{id:'canes',name:'Raising Cane’s',subtitle:'Chicken & sides',mark:'C'},{id:'taco',name:'Taco Bell',subtitle:'Tacos & burritos',mark:'TB'},{id:'panda',name:'Panda Express',subtitle:'Bowls & plates',mark:'P'},{id:'kura',name:'Kura Sushi',subtitle:'Sushi & small plates',mark:'蔵'},{id:'leaves',name:'7 Leaves',subtitle:'Coffee, tea & boba',mark:'7L'},{id:'bean',name:'Coffee Bean & Tea Leaf',subtitle:'Coffee & tea',mark:'CB'},{id:'starbucks',name:'Starbucks',subtitle:'Coffee & refreshers',mark:'S'},{id:'inout',name:'In-N-Out',subtitle:'Burgers & secret options',mark:'IN'},{id:'chipotle',name:'Chipotle',subtitle:'Build your bowl',mark:'CH'}];
const customOptions:Food[]=[{id:'c-naked',restaurant:'canes',name:'Naked chicken finger',serving:'1 finger · no breading',category:'Custom options',calories:70,protein:13,carbs:0,fat:2,quality:'estimate',source:'https://foods.fatsecret.com/calories-nutrition/raising-canes/naked-bird',note:'Off-menu option; ask your location. Rough estimate from an archived FatSecret listing, not published by Cane’s. Piece size and oil absorption vary. Edit these values if you have better information.'},{id:'t-fresco',restaurant:'taco',name:'Crunchy taco · Fresco style',serving:'1 beef taco · dairy replaced',category:'Custom options',calories:140,protein:6,carbs:13,fat:8,quality:'estimate',source:'https://fastfoodnutrition.org/taco-bell/fresco-crunchy-taco',note:'Historical third-party Fresco reference; current customization nutrition is not published in the imported full table. Treat as a rough estimate and adjust for your order.'}];
// Parse checked snapshots as data; avoid inferring thousands of individual JSON object types.
const imported=JSON.parse(importedJson) as {foods:Food[]};
const refreshed=JSON.parse(refreshedJson) as {foods:Food[]};
export const menu:Food[]=[...customOptions,...(refreshed.foods as Food[]),...(imported.foods as Food[])];
export const zero:Macros={calories:0,protein:0,carbs:0,fat:0};
export const round=(n:number)=>Math.round(n*10)/10;
export function totals(items:Line[]):Macros{return items.reduce((a,i)=>({calories:a.calories+i.calories*i.quantity,protein:a.protein+i.protein*i.quantity,carbs:a.carbs+i.carbs*i.quantity,fat:a.fat+i.fat*i.quantity}),{...zero});}
export function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
