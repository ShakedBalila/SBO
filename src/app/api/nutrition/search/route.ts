import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeFoodText, searchMinistryFoods, type NutritionFood } from '@/lib/nutrition-foods';

const translations:Record<string,string>={"שווארמה":"shawarma","חזה עוף":"chicken breast","עוף":"chicken","אורז":"rice","ביצה":"egg","טונה":"tuna","סלמון":"salmon","תפוח אדמה":"potato","לחם":"bread","גבינה":"cheese","יוגורט":"yogurt","בננה":"banana","תפוח":"apple","אבוקדו":"avocado","בקר":"beef","פסטה":"pasta"};
const round=(value:unknown)=>Math.round((Number(value)||0)*10)/10;
const safeName=(value:unknown)=>String(value??'').trim()||'מוצר ללא שם';

async function openFoodFacts(query:string):Promise<NutritionFood[]>{
  const url=new URL('https://world.openfoodfacts.org/cgi/search.pl');url.searchParams.set('search_terms',query);url.searchParams.set('search_simple','1');url.searchParams.set('action','process');url.searchParams.set('json','1');url.searchParams.set('page_size','8');url.searchParams.set('fields','code,product_name,product_name_he,brands,nutriments');
  const response=await fetch(url,{headers:{'User-Agent':'SBO/1.0 (sbo-pi.vercel.app)'},signal:AbortSignal.timeout(8000),next:{revalidate:3600}});if(!response.ok)return [];
  const body=await response.json() as {products?:Array<Record<string,unknown>>};
  return (body.products??[]).flatMap(product=>{const nutrient=product.nutriments as Record<string,unknown>|undefined;if(!nutrient)return [];const code=String(product.code??'');const food={id:`off:${code}`,source:'Open Food Facts',name:safeName(product.product_name_he||product.product_name),brand:String(product.brands??''),barcode:code,calories:round(nutrient['energy-kcal_100g']),proteinG:round(nutrient.proteins_100g),carbsG:round(nutrient.carbohydrates_100g),fatG:round(nutrient.fat_100g)};return food.calories||food.proteinG||food.carbsG||food.fatG?[food]:[];});
}
async function usda(query:string):Promise<NutritionFood[]>{
  const url=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');url.searchParams.set('api_key',process.env.USDA_FDC_API_KEY||'DEMO_KEY');url.searchParams.set('query',query);url.searchParams.set('pageSize','8');
  const response=await fetch(url,{signal:AbortSignal.timeout(8000),next:{revalidate:3600}});if(!response.ok)return [];
  const body=await response.json() as {foods?:Array<{fdcId:number;description:string;brandOwner?:string;foodNutrients?:Array<{nutrientNumber?:string;value?:number}>}>};
  const nutrient=(food:NonNullable<typeof body.foods>[number],number:string)=>food.foodNutrients?.find(item=>item.nutrientNumber===number)?.value??0;
  return (body.foods??[]).map(food=>({id:`usda:${food.fdcId}`,name:safeName(food.description),brand:food.brandOwner??'',source:'USDA',calories:round(nutrient(food,'208')),proteinG:round(nutrient(food,'203')),carbsG:round(nutrient(food,'205')),fatG:round(nutrient(food,'204'))})).filter(food=>food.calories||food.proteinG||food.carbsG||food.fatG);
}

export async function GET(request:Request){
  const user=await currentUser();if(!user)return NextResponse.json({error:'נדרשת התחברות.'},{status:401});
  const params=new URL(request.url).searchParams,query=params.get('q')?.trim()??'',online=params.get('online')==='1';
  const preferences=await db.foodPreference.findMany({where:{userId:user.id},orderBy:[{favorite:'desc'},{lastUsedAt:'desc'},{useCount:'desc'}],take:50});
  const preferenceMap=new Map(preferences.map(item=>[item.foodKey,item]));
  const personal=await db.userFood.findMany({where:{userId:user.id,...(query.length>=2?{name:{contains:query,mode:'insensitive'}}:{})},orderBy:{updatedAt:'desc'},take:20});
  const personalFoods:NutritionFood[]=personal.map(food=>{const key=`user:${food.id}`,preference=preferenceMap.get(key);return{id:key,name:food.name,brand:food.brand,barcode:food.barcode,calories:food.caloriesPer100,proteinG:Number(food.proteinPer100G),carbsG:Number(food.carbsPer100G),fatG:Number(food.fatPer100G),source:'המאגר האישי שלי',favorite:preference?.favorite??false,useCount:preference?.useCount??0,lastUsedAt:preference?.lastUsedAt?.toISOString()??null};});
  if(query.length<2)return NextResponse.json({foods:personalFoods,hasOnline:false});
  const ministry=searchMinistryFoods(query).map(food=>{const preference=preferenceMap.get(food.id);return{...food,favorite:preference?.favorite??false,useCount:preference?.useCount??0,lastUsedAt:preference?.lastUsedAt?.toISOString()??null};});
  const local=[...personalFoods,...ministry].sort((a,b)=>Number(b.favorite)-Number(a.favorite)||(b.useCount??0)-(a.useCount??0));
  if(!online)return NextResponse.json({foods:local.slice(0,24),hasOnline:true});
  const remoteQuery=translations[normalizeFoodText(query)]??query;
  const settled=await Promise.allSettled([openFoodFacts(remoteQuery),usda(remoteQuery)]),remote=settled.flatMap(result=>result.status==='fulfilled'?result.value:[]),seen=new Set<string>();
  const foods=[...local,...remote].filter(food=>{const key=`${normalizeFoodText(food.name)}|${food.calories}|${food.proteinG}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,32);
  return NextResponse.json({foods,...(!foods.length?{error:'לא נמצאו תוצאות. אפשר ליצור מזון אישי לפי ערכים ל־100 גרם.'}:{})});
}
