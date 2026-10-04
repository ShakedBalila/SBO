import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeFoodText, searchMinistryFoods, type NutritionFood } from '@/lib/nutrition-foods';
import { mergeFoodResults, searchSwissFoods } from '@/lib/food-search';

const translations:Record<string,string>={"שווארמה":"shawarma","חזה עוף":"chicken breast","עוף":"chicken","אורז":"rice","ביצה":"egg","טונה":"tuna","סלמון":"salmon","תפוח אדמה":"potato","לחם":"bread","גבינה":"cheese","יוגורט":"yogurt","בננה":"banana","תפוח":"apple","אבוקדו":"avocado","בקר":"beef","פסטה":"pasta"};
const round=(value:unknown)=>Math.round((Number(value)||0)*10)/10;
const safeName=(value:unknown)=>String(value??'').trim()||'מוצר ללא שם';

async function openFoodFactsUncached(query:string):Promise<NutritionFood[]>{
  const url=new URL('https://world.openfoodfacts.org/cgi/search.pl');url.searchParams.set('search_terms',query);url.searchParams.set('search_simple','1');url.searchParams.set('action','process');url.searchParams.set('json','1');url.searchParams.set('page_size','8');url.searchParams.set('fields','code,product_name,product_name_he,brands,serving_size,nutriments,countries_tags');
  const response=await fetch(url,{headers:{'User-Agent':'SBO/1.0 (sbo-pi.vercel.app)'},signal:AbortSignal.timeout(5000),cache:'no-store'});if(!response.ok)throw new Error('Open Food Facts HTTP '+response.status);
  const body=await response.json() as {products?:Array<Record<string,unknown>>};
  return (body.products??[]).flatMap(product=>{const nutrient=product.nutriments as Record<string,unknown>|undefined;if(!nutrient)return [];const code=String(product.code??''),match=String(product.serving_size??'').match(/([\d.,]+)\s*g/i);const food={id:`off:${code}`,source:Array.isArray(product.countries_tags)&&product.countries_tags.includes('en:israel')?'Open Food Facts IL':'Open Food Facts',name:safeName(product.product_name_he||product.product_name),brand:String(product.brands??''),barcode:code,servingName:'מנה',servingGrams:match?Number(match[1].replace(',','.')):100,calories:round(nutrient['energy-kcal_100g']),proteinG:round(nutrient.proteins_100g),carbsG:round(nutrient.carbohydrates_100g),fatG:round(nutrient.fat_100g)};return food.calories||food.proteinG||food.carbsG||food.fatG?[food]:[];});
}
async function usdaUncached(query:string):Promise<NutritionFood[]>{
  const url=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');url.searchParams.set('api_key',process.env.USDA_FDC_API_KEY||'DEMO_KEY');url.searchParams.set('query',query);url.searchParams.set('pageSize','12');
  // The default search includes Foundation, Branded, SR Legacy and FNDDS.
  const response=await fetch(url,{signal:AbortSignal.timeout(5000),cache:'no-store'});if(!response.ok)throw new Error('USDA HTTP '+response.status);
  const body=await response.json() as {foods?:Array<{fdcId:number;description:string;dataType?:string;brandOwner?:string;foodNutrients?:Array<{nutrientNumber?:string;value?:number}>}>};
  const nutrient=(food:NonNullable<typeof body.foods>[number],...numbers:string[])=>numbers.map(number=>food.foodNutrients?.find(item=>item.nutrientNumber===number)?.value).find(value=>value!==undefined)??0;
  return (body.foods??[]).map(food=>({id:`usda:${food.fdcId}`,name:safeName(food.description),brand:food.brandOwner??'',source:`USDA${food.dataType?` · ${food.dataType}`:''}`,calories:round(nutrient(food,'208','958','957')),proteinG:round(nutrient(food,'203')),carbsG:round(nutrient(food,'205')),fatG:round(nutrient(food,'204'))})).filter(food=>food.calories||food.proteinG||food.carbsG||food.fatG);
}

// Cache successful parsed catalogs, rather than failed HTTP responses or rate limits.
const openFoodFacts=unstable_cache(openFoodFactsUncached,['sbo-food-off-v2'],{revalidate:3600});
const usda=unstable_cache(usdaUncached,['sbo-food-usda-v2'],{revalidate:3600});

export async function GET(request:Request){
  const user=await currentUser();if(!user)return NextResponse.json({error:'נדרשת התחברות.'},{status:401});
  const params=new URL(request.url).searchParams,query=(params.get('q')?.trim()??'').slice(0,200);
  const remoteQuery=translations[normalizeFoodText(query)]??query;
  // Start both providers before database reads, so all sources search in parallel.
  const remotePromise=query.length>=2?Promise.allSettled([openFoodFacts(query),usda(remoteQuery)]):null;
  const preferences=await db.foodPreference.findMany({where:{userId:user.id},orderBy:[{favorite:'desc'},{lastUsedAt:'desc'},{useCount:'desc'}],take:50});
  const preferenceMap=new Map(preferences.map(item=>[item.foodKey,item]));
  const personal=await db.userFood.findMany({where:{userId:user.id,...(query.length>=2?{name:{contains:query,mode:'insensitive'}}:{})},orderBy:{updatedAt:'desc'},take:20});
  const personalFoods:NutritionFood[]=personal.map(food=>{const key=`user:${food.id}`,preference=preferenceMap.get(key);return{id:key,name:food.name,brand:food.brand,barcode:food.barcode,servingName:preference?.lastServingName??food.servingName,servingGrams:Number(preference?.lastServingGrams??food.servingGrams),lastQuantity:Number(preference?.lastQuantity??0)||null,lastUnit:preference?.lastUnit as NutritionFood['lastUnit'],calories:food.caloriesPer100,proteinG:Number(food.proteinPer100G),carbsG:Number(food.carbsPer100G),fatG:Number(food.fatPer100G),source:'המאגר האישי שלי',favorite:preference?.favorite??false,useCount:preference?.useCount??0,lastUsedAt:preference?.lastUsedAt?.toISOString()??null};});
  if(query.length<2)return NextResponse.json({foods:personalFoods});
  const ministry=searchMinistryFoods(query).map(food=>{const preference=preferenceMap.get(food.id);return{...food,servingName:preference?.lastServingName??'מנה',servingGrams:Number(preference?.lastServingGrams??100),lastQuantity:Number(preference?.lastQuantity??0)||null,lastUnit:preference?.lastUnit as NutritionFood['lastUnit'],favorite:preference?.favorite??false,useCount:preference?.useCount??0,lastUsedAt:preference?.lastUsedAt?.toISOString()??null};});
  const settled=await remotePromise!;
  settled.forEach((result,index)=>{if(result.status==='rejected')console.warn('SBO food provider unavailable', ['Open Food Facts','USDA'][index], result.reason?.name, result.reason?.cause?.code??result.reason?.message??'');});
  const remote=[...searchSwissFoods(remoteQuery),...settled.flatMap(result=>result.status==='fulfilled'?result.value:[])].map(food=>{const preference=preferenceMap.get(food.id);return{...food,servingName:preference?.lastServingName??food.servingName??'מנה',servingGrams:Number(preference?.lastServingGrams??food.servingGrams??100),lastQuantity:Number(preference?.lastQuantity??0)||null,lastUnit:preference?.lastUnit as NutritionFood['lastUnit'],favorite:preference?.favorite??false,useCount:preference?.useCount??0};});
  const foods=mergeFoodResults([...personalFoods,...ministry,...remote]);
  const unavailableSources=settled.flatMap((result,index)=>result.status==='rejected'?[['Open Food Facts','USDA'][index]]:[]);
  return NextResponse.json({foods,unavailableSources});
}
