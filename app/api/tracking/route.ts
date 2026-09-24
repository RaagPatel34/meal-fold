import {z} from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/raw';
import {mealSchema} from '@/lib/meal-schema';
export const dynamic='force-dynamic';
const goal=z.number().finite().positive().max(20000).optional();
const goalsSchema=z.object({calories:goal,protein:goal,carbs:goal,fat:goal}).strict();
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function context(req:Request){
 const user=await getChatGPTUser();
 if(!user)return {error:reply({error:'Sign in to use goals and favorites.'},401)};
 const origin=req.headers.get('origin');
 if(req.method!=='GET'&&origin&&origin!==new URL(req.url).origin)return {error:reply({error:'Request origin is not allowed.'},403)};
 return {user};
}
export async function GET(req:Request){try{
 const c=await context(req);if(c.error)return c.error;
 const result=await database().batch<{goals?:string;meal?:string}>([
  database().prepare('SELECT goals FROM tracking_preferences WHERE user_id = ?').bind(c.user!.userId),
  database().prepare('SELECT meal FROM favorite_meals WHERE user_id = ? ORDER BY created_at DESC').bind(c.user!.userId),
 ]);
 return reply({goals:result[0].results[0]?JSON.parse(result[0].results[0].goals as string):{},favorites:result[1].results.map(r=>JSON.parse(r.meal as string))});
}catch(e){console.error('Load tracking failed',e);return reply({error:'Goals and favorites could not load. Please try again.'},503)}}
export async function PUT(req:Request){try{
 const c=await context(req);if(c.error)return c.error;
 const raw=await req.text();if(raw.length>2000)return reply({error:'Goals are too large.'},413);
 let input;try{input=goalsSchema.safeParse(JSON.parse(raw))}catch{return reply({error:'Enter valid goals.'},400)}
 if(!input.success)return reply({error:'Use positive numbers up to 20,000, or leave a goal blank.'},400);
 await database().prepare('INSERT INTO tracking_preferences (user_id,goals) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET goals=excluded.goals').bind(c.user!.userId,JSON.stringify(input.data)).run();
 return reply({goals:input.data});
}catch(e){console.error('Save goals failed',e);return reply({error:'Goals could not save. Your changes are still here.'},503)}}
export async function POST(req:Request){try{
 const c=await context(req);if(c.error)return c.error;
 const raw=await req.text();if(raw.length>350000)return reply({error:'This favorite has too many details.'},413);
 let input;try{input=mealSchema.safeParse(JSON.parse(raw))}catch{return reply({error:'Invalid favorite meal.'},400)}
 if(!input.success)return reply({error:'Check the favorite’s name, portions and nutrition.'},400);
 const m=input.data;
 await database().prepare('INSERT INTO favorite_meals (user_id,id,meal,created_at) VALUES (?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET meal=excluded.meal').bind(c.user!.userId,m.id,JSON.stringify(m),Date.now()).run();
 return reply({favorite:m});
}catch(e){console.error('Save favorite failed',e);return reply({error:'This favorite could not save. Please try again.'},503)}}
export async function DELETE(req:Request){try{
 const c=await context(req);if(c.error)return c.error;
 const id=z.string().uuid().safeParse(new URL(req.url).searchParams.get('id'));if(!id.success)return reply({error:'Invalid favorite.'},400);
 await database().prepare('DELETE FROM favorite_meals WHERE user_id = ? AND id = ?').bind(c.user!.userId,id.data).run();return reply({ok:true});
}catch(e){console.error('Remove favorite failed',e);return reply({error:'This favorite could not be removed.'},503)}}
