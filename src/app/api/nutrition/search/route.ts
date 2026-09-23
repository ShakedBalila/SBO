import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

type Food={id:string;name:string;brand?:string;calories:number;proteinG:number;carbsG:number;fatG:number;source?:string;sourceUrl?:string};
const common:Food[]=[
  {id:"common-chicken",name:"חזה עוף מבושל",calories:165,proteinG:31,carbsG:0,fatG:3.6},
  {id:"common-rice",name:"אורז לבן מבושל",calories:130,proteinG:2.7,carbsG:28.2,fatG:.3},
  {id:"common-egg",name:"ביצה מבושלת",calories:155,proteinG:12.6,carbsG:1.1,fatG:10.6},
  {id:"common-tuna",name:"טונה במים מסוננת",calories:116,proteinG:25.5,carbsG:0,fatG:.8},
  {id:"common-salmon",name:"סלמון אפוי",calories:208,proteinG:20.4,carbsG:0,fatG:13.4},
  {id:"common-potato",name:"תפוח אדמה מבושל",calories:87,proteinG:1.9,carbsG:20.1,fatG:.1},
  {id:"common-bread",name:"לחם מלא",calories:247,proteinG:13,carbsG:41,fatG:3.4},
  {id:"common-cottage",name:"קוטג׳ 5%",calories:121,proteinG:11.1,carbsG:3,fatG:5},
  {id:"common-yogurt",name:"יוגורט טבעי 3%",calories:61,proteinG:3.5,carbsG:4.7,fatG:3.3},
  {id:"common-banana",name:"בננה",calories:89,proteinG:1.1,carbsG:22.8,fatG:.3},
  {id:"common-apple",name:"תפוח עץ",calories:52,proteinG:.3,carbsG:13.8,fatG:.2},
  {id:"common-avocado",name:"אבוקדו",calories:160,proteinG:2,carbsG:8.5,fatG:14.7},
];
const queryTranslations:Record<string,string>={"שווארמה":"shawarma","שוארמה":"shawarma","חזה עוף":"chicken breast","עוף":"chicken","אורז":"rice","ביצה":"egg","טונה":"tuna","סלמון":"salmon","תפוח אדמה":"potato","לחם":"bread","גבינה":"cheese","יוגורט":"yogurt","בננה":"banana","תפוח":"apple","אבוקדו":"avocado","בקר":"beef","פסטה":"pasta"};
const wordTranslations:Record<string,string>={chicken:"עוף",breast:"חזה",cooked:"מבושל",roasted:"צלוי",rice:"אורז",white:"לבן",brown:"מלא",egg:"ביצה",tuna:"טונה",salmon:"סלמון",potato:"תפוח אדמה",bread:"לחם",cheese:"גבינה",yogurt:"יוגורט",banana:"בננה",apple:"תפוח",avocado:"אבוקדו",beef:"בקר",pasta:"פסטה",raw:"נא",grilled:"צלוי",fried:"מטוגן",boiled:"מבושל",plain:"טבעי",whole:"מלא",milk:"חלב",turkey:"הודו",fish:"דג",tomato:"עגבנייה"};
const round=(input:unknown)=>Math.round((Number.isFinite(Number(input))?Number(input):0)*10)/10;
function hebrewName(input:unknown){const name=String(input??"").trim();if(!/[A-Za-z]/.test(name))return name||"מוצר ללא שם";const translated=name.toLowerCase().split(/([\s,()-]+)/).map(part=>wordTranslations[part]??part).join("").replace(/\s+/g," ").trim();return translated!==name.toLowerCase()?translated:`מוצר · ${name}`;}
async function openFoodFacts(search:string):Promise<Food[]>{
  const url=new URL("https://world.openfoodfacts.org/cgi/search.pl");url.searchParams.set("search_terms",search);url.searchParams.set("search_simple","1");url.searchParams.set("action","process");url.searchParams.set("json","1");url.searchParams.set("page_size","8");url.searchParams.set("fields","code,product_name,product_name_he,brands,nutriments");
  const response=await fetch(url,{headers:{"User-Agent":"SBO/1.0 (sbo-pi.vercel.app)"},signal:AbortSignal.timeout(8000),next:{revalidate:3600}});if(!response.ok)return [];
  const body=await response.json() as {products?:Array<Record<string,unknown>>};
  return (body.products??[]).flatMap(product=>{const nutrients=product.nutriments as Record<string,unknown>|undefined;if(!nutrients)return [];const food={id:`off-${String(product.code??crypto.randomUUID())}`,source:"Open Food Facts",sourceUrl:`https://world.openfoodfacts.org/product/${encodeURIComponent(String(product.code??""))}`,name:hebrewName(product.product_name_he||product.product_name),brand:String(product.brands??""),calories:round(nutrients["energy-kcal_100g"]),proteinG:round(nutrients.proteins_100g),carbsG:round(nutrients.carbohydrates_100g),fatG:round(nutrients.fat_100g)};return food.calories||food.proteinG||food.carbsG||food.fatG?[food]:[];});
}
async function usda(search:string):Promise<Food[]>{
  const key=process.env.USDA_FDC_API_KEY||"DEMO_KEY",url=new URL("https://api.nal.usda.gov/fdc/v1/foods/search");url.searchParams.set("api_key",key);url.searchParams.set("query",search);url.searchParams.set("pageSize","8");
  const response=await fetch(url,{signal:AbortSignal.timeout(8000),next:{revalidate:3600}});if(!response.ok)return [];
  const body=await response.json() as {foods?:Array<{fdcId:number;description:string;brandOwner?:string;foodNutrients?:Array<{nutrientName?:string;nutrientNumber?:string;value?:number}>}>};
  const nutrient=(food:NonNullable<typeof body.foods>[number],number:string,name:string)=>food.foodNutrients?.find(item=>item.nutrientNumber===number||item.nutrientName?.toLowerCase()===name)?.value??0;
  return (body.foods??[]).map(food=>({id:`usda-${food.fdcId}`,name:hebrewName(food.description),brand:food.brandOwner??"",source:"USDA FoodData Central",sourceUrl:`https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`,calories:round(nutrient(food,"208","energy")),proteinG:round(nutrient(food,"203","protein")),carbsG:round(nutrient(food,"205","carbohydrate, by difference")),fatG:round(nutrient(food,"204","total lipid (fat)"))})).filter(food=>food.calories||food.proteinG||food.carbsG||food.fatG);
}
export async function GET(request:Request){
  if(!await currentUser())return NextResponse.json({error:"נדרשת התחברות."},{status:401});
  const params=new URL(request.url).searchParams,query=params.get("q")?.trim()??"";if(query.length<2||query.length>100)return NextResponse.json({foods:[]});
  const normalized=query.toLocaleLowerCase("he-IL"),cached=common.filter(food=>food.name.toLocaleLowerCase("he-IL").includes(normalized)).map(food=>({...food,source:"מאגר SBO · אומדן למזון כללי"}));
  if(cached.length&&params.get("online")!=="1")return NextResponse.json({foods:cached,hasOnline:true});
  const search=queryTranslations[normalized]??query,results=await Promise.allSettled([openFoodFacts(search),usda(search)]),remote=results.flatMap(result=>result.status==="fulfilled"?result.value:[]),seen=new Set<string>();
  const foods=[...cached,...remote].filter(food=>{const key=`${food.name}|${food.calories}|${food.proteinG}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,16);
  return NextResponse.json({foods,...(!foods.length?{error:"לא נמצאו תוצאות במאגרים כרגע. אפשר להוסיף את המזון ידנית ולשמור אותו לשימוש מהיר."}:{})});
}
