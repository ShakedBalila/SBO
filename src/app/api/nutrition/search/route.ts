import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

type Food={id:string;name:string;brand?:string;calories:number;proteinG:number;carbsG:number;fatG:number};
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

const value=(input:unknown)=>Number.isFinite(Number(input))?Number(input):0;
export async function GET(request:Request){
  if(!await currentUser())return NextResponse.json({error:"נדרשת התחברות."},{status:401});
  const query=new URL(request.url).searchParams.get("q")?.trim()??"";
  if(query.length<2)return NextResponse.json({foods:[]});
  const normalized=query.toLocaleLowerCase("he-IL");
  const local=common.filter(food=>food.name.toLocaleLowerCase("he-IL").includes(normalized));
  if(local.length)return NextResponse.json({foods:local});
  try{
    const url=new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms",query);url.searchParams.set("search_simple","1");url.searchParams.set("action","process");url.searchParams.set("json","1");url.searchParams.set("page_size","8");url.searchParams.set("fields","code,product_name,product_name_he,brands,nutriments");
    const response=await fetch(url,{headers:{"User-Agent":"SBO/1.0 (sbo-pi.vercel.app)"},next:{revalidate:3600}});if(!response.ok)throw new Error("search failed");
    const body=await response.json() as {products?:Array<Record<string,unknown>>};
    const foods=(body.products??[]).map(product=>{const nutrients=(product.nutriments??{}) as Record<string,unknown>;return {id:String(product.code??crypto.randomUUID()),name:String(product.product_name_he||product.product_name||"מוצר ללא שם"),brand:String(product.brands??""),calories:value(nutrients["energy-kcal_100g"]),proteinG:value(nutrients.proteins_100g),carbsG:value(nutrients.carbohydrates_100g),fatG:value(nutrients.fat_100g)};}).filter(food=>food.calories||food.proteinG||food.carbsG||food.fatG);
    return NextResponse.json({foods});
  }catch{return NextResponse.json({foods:[],error:"לא נמצאו תוצאות כרגע."});}
}
