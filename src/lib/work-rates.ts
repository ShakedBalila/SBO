import {HttpError} from './http';
import {recordDate} from './modules';
export async function workRate(currency:string,date:string){
  recordDate.parse(date);
  if(!/^(ILS|USD|EUR|GBP|CHF|CAD|AUD|JPY)$/.test(currency))throw new HttpError(400,'מטבע לא נתמך.');
  if(currency==='ILS')return {exchangeRate:1,rateDate:date,rateSource:'ILS'};
  try{
    const response=await fetch(`https://api.frankfurter.dev/v2/rates?base=${currency}&quotes=ILS&date=${date}`,{signal:AbortSignal.timeout(6000),next:{revalidate:86400}});
    if(!response.ok)throw new Error('Rate unavailable');
    const rows=await response.json();const value=Array.isArray(rows)?rows[0]:null;if(!value)throw new Error('No rate');if(!Number.isFinite(value.rate)||value.rate<=0||value.base!==currency||value.quote!=='ILS'||!recordDate.safeParse(value.date).success||value.date>date)throw new Error('Invalid rate');
    return {exchangeRate:Number(value.rate),rateDate:String(value.date),rateSource:'Frankfurter'};
  }catch{throw new HttpError(503,'שער המטבע אינו זמין לתאריך הזה. ניתן להזין שער ידני ולשמור.');}
}
