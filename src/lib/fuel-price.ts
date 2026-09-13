const REGULATED_SOURCE='https://www.doralon.co.il/fuels-price/';
const PRICE_FEEDS=[REGULATED_SOURCE,'https://r.jina.ai/http://www.doralon.co.il/fuels-price/'];
const FALLBACK_PRICE=7.75;
const brands=[
  {name:'פז',sourceUrl:'https://www.paz.co.il/price-lists'},
  {name:'דלק',sourceUrl:'https://delek.co.il/מחירון/'},
  {name:'סונול',sourceUrl:'https://www.sonol.co.il/'}
];
export type FuelPriceResult={average:number;stations:{name:string;price:number;sourceUrl:string}[];checkedAt:string;online:boolean};
export function parseSelfService95Price(content:string){
  const normalized=content.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;|&quot;/g,' ').replace(/\s+/g,' ');
  const marker=normalized.search(/בנזין\s*95[\s\S]{0,160}?שירות\s*עצמי/);
  if(marker<0)return null;
  const match=normalized.slice(marker,marker+700).match(/(?:^|\s)(\d{1,2}[.,]\d{2})(?=\s|₪|$)/);
  const value=Number(match?.[1]?.replace(',','.'));
  return Number.isFinite(value)&&value>=4&&value<=15?value:null;
}
export async function getIsraelFuelPrice():Promise<FuelPriceResult>{
  let price=FALLBACK_PRICE,online=false,checkedAt='2026-09-07T00:00:00.000Z';
  const attempts=await Promise.allSettled(PRICE_FEEDS.map(async url=>{
    const response=await fetch(url,{next:{revalidate:21600},headers:{'User-Agent':'SBO/0.1 fuel monitor'},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('price source unavailable');
    const parsed=parseSelfService95Price(await response.text());
    if(parsed===null)throw new Error('invalid fuel price');
    return parsed;
  }));
  const verified=attempts.find((result):result is PromiseFulfilledResult<number>=>result.status==='fulfilled');
  if(verified){price=verified.value;online=true;checkedAt=new Date().toISOString();}
  const stations=brands.map(brand=>({...brand,price}));
  return {average:Number((stations.reduce((sum,station)=>sum+station.price,0)/stations.length).toFixed(3)),stations,checkedAt,online};
}
