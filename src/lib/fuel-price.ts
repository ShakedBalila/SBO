const REGULATED_SOURCE='https://www.doralon.co.il/fuels-price/';
const FALLBACK_PRICE=7.75;
const brands=[
  {name:'פז',sourceUrl:'https://www.paz.co.il/price-lists'},
  {name:'דלק',sourceUrl:'https://delek.co.il/מחירון/'},
  {name:'סונול',sourceUrl:'https://www.sonol.co.il/'}
];
export type FuelPriceResult={average:number;stations:{name:string;price:number;sourceUrl:string}[];checkedAt:string;online:boolean};
export async function getIsraelFuelPrice():Promise<FuelPriceResult>{
  let price=FALLBACK_PRICE,online=false,checkedAt='2026-09-07T00:00:00.000Z';
  try{
    const response=await fetch(REGULATED_SOURCE,{next:{revalidate:21600},headers:{'User-Agent':'SBO/0.1 fuel monitor'},signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error('price source unavailable');
    const normalized=(await response.text()).replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;|&quot;/g,' ').replace(/\s+/g,' ');
    const match=normalized.match(/בנזין\s*95[\s\S]{0,80}?שירות\s*עצמי[\s\S]{0,120}?(\d+[.,]\d{2})/);
    const parsed=Number(match?.[1]?.replace(',','.'));
    if(!Number.isFinite(parsed)||parsed<4||parsed>15)throw new Error('invalid fuel price');
    price=parsed;online=true;checkedAt=new Date().toISOString();
  }catch{}
  const stations=brands.map(brand=>({...brand,price}));
  return {average:Number((stations.reduce((sum,station)=>sum+station.price,0)/stations.length).toFixed(3)),stations,checkedAt,online};
}
