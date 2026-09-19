import imported from '@/data/imported-menu.json';
import curated from '@/data/curated-menu.json';
export type Macros={calories:number;protein:number;carbs:number;fat:number};
export type Food=Macros & {id:string;name:string;restaurant:string;serving:string;category:string;quality:'published'|'estimate'|'custom';source:string;note:string};
export type Line=Food & {quantity:number;lineId:string};
export type Meal={id:string;name:string;date:string;period:string;items:Line[];createdAt?:number};
export const restaurants=[{id:'canes',name:'Raising Cane’s',subtitle:'Chicken & sides',mark:'C'},{id:'taco',name:'Taco Bell',subtitle:'Tacos & burritos',mark:'TB'},{id:'panda',name:'Panda Express',subtitle:'Bowls & plates',mark:'P'},{id:'kura',name:'Kura Sushi',subtitle:'Sushi & small plates',mark:'蔵'},{id:'leaves',name:'7 Leaves',subtitle:'Coffee, tea & boba',mark:'7L'},{id:'bean',name:'Coffee Bean & Tea Leaf',subtitle:'Coffee & tea',mark:'CB'},{id:'starbucks',name:'Starbucks',subtitle:'Coffee & refreshers',mark:'S'},{id:'inout',name:'In-N-Out',subtitle:'Burgers & secret options',mark:'IN'},{id:'chipotle',name:'Chipotle',subtitle:'Build your bowl',mark:'CH'}];
const sources={canes:'https://raisingcanes.cdn.prismic.io/raisingcanes/IxTKraMRo_HyNWx2_Allergen%26NutritionalInformation_ALL_DIGITAL_8.26.pdf',panda:'https://www.pandaexpress.com/nutritioninformation',kura:'https://kurasushi.com/menu/nutrition',taco:'https://fastfoodnutrition.org/taco-bell/'};
function food(id:string,restaurant:keyof typeof sources,name:string,serving:string,category:string,calories:number,protein:number,carbs:number,fat:number,extra:Partial<Food>={}):Food{return {id,restaurant,name,serving,category,calories,protein,carbs,fat,quality:'published',source:sources[restaurant],note:restaurant==='canes'?'Raising Cane’s nutrition sheet, August 2026. Standard preparation.':'Restaurant nutrition table checked September 16, 2026. Standard preparation.',...extra};}
const originalMenu:Food[]=[
food('c-finger','canes','Chicken finger','1 finger · 55 g','Chicken',130,12,5,6),
food('c-naked','canes','Naked chicken finger','1 finger · no breading','Custom options',70,13,0,2,{quality:'estimate',source:'https://foods.fatsecret.com/calories-nutrition/raising-canes/naked-bird',note:'Off-menu option; ask your location. Rough estimate from an archived FatSecret listing, not published by Cane’s. Piece size and oil absorption vary. Edit these values if you have better information.'}),
food('c-fries','canes','Crinkle-cut fries','1 side · 144 g','Sides',420,5,53,21),
food('c-toast','canes','Texas toast','1 slice · 47 g','Sides',150,4,23,4.5),
food('c-sauce','canes','Cane’s Sauce','1 cup · 43 g','Sauces',190,0,6,18),
food('c-slaw','canes','Coleslaw','1 side · 87 g','Sides',90,1,10,6),
food('c-sandwich','canes','Chicken sandwich','1 sandwich · 297 g','Chicken',810,45,68,40),
food('c-sweet','canes','Sweet tea','22 fl oz · excluding ice','Drinks',230,0,60,0),
food('c-unsweet','canes','Unsweet tea','22 fl oz · excluding ice','Drinks',0,0,0,0),
food('c-lemon','canes','Lemonade','22 fl oz · excluding ice','Drinks',290,0,76,0),
food('t-crunchy','taco','Crunchy taco','1 beef taco','Tacos',170,8,13,9,{quality:'estimate',source:sources.taco+'crunchy-taco',note:'Third-party reference: Fast Food Nutrition, last updated August 2020. Current Taco Bell macros could not be verified; treat as an estimate.'}),
food('t-soft','taco','Soft taco','1 beef taco','Tacos',180,9,17,9,{quality:'estimate',source:sources.taco+'soft-taco-beef',note:'Third-party reference: Fast Food Nutrition, last updated August 2020. Treat as an estimate and check your current order.'}),
food('t-bean','taco','Bean burrito','1 burrito','Burritos',350,13,54,9,{quality:'estimate',source:sources.taco+'bean-burrito',note:'Third-party reference: Fast Food Nutrition, last updated February 2020. Treat as an estimate and check your current order.'}),
food('t-fresco','taco','Crunchy taco · Fresco style','1 beef taco · dairy replaced','Custom options',140,6,13,8,{quality:'estimate',source:sources.taco+'fresco-crunchy-taco',note:'Third-party Fresco reference from Fast Food Nutrition; recipe date unspecified. Taco Bell describes Fresco as replacing dairy and mayo sauces with pico de gallo. Treat nutrition as an estimate.'}),
food('p-orange','panda','Orange chicken','1 entrée · 5.92 oz','Entrées',510,16,53,24),
food('p-grilled','panda','Grilled teriyaki chicken','1 entrée · 6 oz','Entrées',275,33,14,10),
food('p-broccoli','panda','Broccoli beef','1 entrée · 5.44 oz','Entrées',150,15,12,6),
food('p-kung','panda','Kung pao chicken','1 entrée · 6.73 oz','Entrées',320,17,15,21),
food('p-rice','panda','White steamed rice','1 side · 11 oz','Sides',520,10,118,0),
food('p-chow','panda','Chow mein','1 side · 11 oz','Sides',600,15,94,23),
food('p-fried','panda','Fried rice','1 side · 11 oz','Sides',620,13,101,19),
food('p-greens','panda','Super greens','1 side · 10 oz','Sides',130,9,14,4),
food('p-sauce','panda','Teriyaki sauce','1 serving · 1.8 oz','Sauces',70,0,16,0),
food('k-salmon','kura','Salmon nigiri','1 standard menu serving','Nigiri',90,5,11,2.5),
food('k-tuna','kura','Tuna nigiri','1 standard menu serving','Nigiri',70,6,11,0),
food('k-toro','kura','Salmon toro','1 standard menu serving','Nigiri',110,7,11,4),
food('k-seared','kura','Seared salmon with Japanese mayo','1 standard menu serving','Nigiri',120,5,11,6),
food('k-roll','kura','Spicy tuna roll','1 standard menu serving','Rolls',130,7,20,2.5),
food('k-hand','kura','Spicy tuna hand roll','1 hand roll','Rolls',100,7,11,3),
food('k-edamame','kura','Edamame','1 standard side serving','Sides',140,13,12,4),
food('k-ponzu','kura','Garlic ponzu sashimi','1 standard side serving','Sides',180,23,3,8),
];
export const menu:Food[]=[...originalMenu,...(imported.foods as Food[]),...(curated as Food[])];
export const zero:Macros={calories:0,protein:0,carbs:0,fat:0};
export const round=(n:number)=>Math.round(n*10)/10;
export function totals(items:Line[]):Macros{return items.reduce((a,i)=>({calories:a.calories+i.calories*i.quantity,protein:a.protein+i.protein*i.quantity,carbs:a.carbs+i.carbs*i.quantity,fat:a.fat+i.fat*i.quantity}),{...zero});}
export function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
