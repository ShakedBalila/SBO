import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { apiError, HttpError } from '@/lib/http';

export async function GET(request:Request){
  try{
    if(!await currentUser())throw new HttpError(401,'יש להתחבר מחדש.');
    const year=Number(new URL(request.url).searchParams.get('year'));
    if(!Number.isInteger(year)||year<1900||year>2200)throw new HttpError(400,'השנה אינה תקינה.');
    const url=`https://www.hebcal.com/hebcal?v=1&cfg=json&year=${year}&yt=G&i=on&lg=he&maj=on&min=on&mod=on&nx=on&mf=on`;
    const response=await fetch(url,{next:{revalidate:86400},headers:{'User-Agent':'SBO/1.0 (https://sbo-pi.vercel.app)'}});
    if(!response.ok)throw new HttpError(502,'לא ניתן לטעון כרגע את חגי ישראל.');
    const body=await response.json();
    const holidays=(body.items??[]).filter((item:{category?:string})=>item.category==='holiday'||item.category==='roshchodesh').map((item:{date:string;hebrew?:string;title:string;link?:string;subcat?:string;category?:string})=>({id:`holiday-${item.date}-${item.title}`,title:item.hebrew||item.title,date:item.date.slice(0,10),endDate:item.date.slice(0,10),allDay:true,color:item.category==='roshchodesh'?'#8b76c8':'#d39b42',type:item.category==='roshchodesh'?'ראש חודש':'חג ומועד',system:true,link:item.link??null,subcat:item.subcat??null}));
    return NextResponse.json({holidays,attribution:'Hebcal.com',source:'https://www.hebcal.com/home/195/jewish-calendar-rest-api'},{headers:{'Cache-Control':'public, max-age=3600, s-maxage=86400'}});
  }catch(error){return apiError(error);}
}
