import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/raw';
import {mealsCsv} from '@/lib/log-tools';
import type {Meal} from '@/lib/menu';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Sign in to export your food log.'},{status:401});
  const results=await database().batch<{id:string;date:string;name:string;period:string;items:string}>([
   database().prepare('SELECT id,date,name,period,items FROM meals WHERE user_id = ? ORDER BY date,created_at').bind(user.userId),
  ]);
  const meals:Meal[]=results[0].results.map(row=>({...row,items:JSON.parse(row.items)}));
  return new Response(mealsCsv(meals),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="meal-fold-food-log.csv"','Cache-Control':'no-store'}});
 }catch(e){console.error('Export failed',e);return Response.json({error:'Your log could not export. Please try again.'},{status:503});}
}
