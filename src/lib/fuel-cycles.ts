export type FuelCycleInput = {
  id:string; date:Date|string; createdAt:Date|string;
  currentOdometerKm:number|null; distanceMode?:string; actualDistanceKm?:number|null;
  distanceStartRefuelId?:string|null; distanceSource?:string|null; distanceConfirmedAt?:Date|string|null;
  liters:number|{toString():string}; isFullTank:boolean|null;
};
export type FuelCycleResult = {previousFullRefuelId:string; cycleDistanceKm:number; cycleFuelLiters:number; cycleKmPerLiter:number};
export type FuelCycleStatus='AWAITING_NEXT_FULL'|'AWAITING_ACTUAL_DISTANCE'|'CALCULATED'|'NEEDS_REVIEW';
export type FuelCycle = {previousFullRefuelId:string|null; includedRefuelIds:string[]; cycleFuelLiters:number; cycleDistanceKm:number|null; cycleKmPerLiter:number|null; cycleStatus:FuelCycleStatus};
export class FuelOdometerError extends Error {constructor(){super('הקילומטראז׳ לא יכול להיות נמוך מהתדלוק הקודם.');}}
const sorted=(input:FuelCycleInput[])=>[...input].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()||new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()||a.id.localeCompare(b.id));
export function validateFuelOdometers(input:FuelCycleInput[]){let previous:number|null=null;for(const row of sorted(input)){if(row.currentOdometerKm!==null){if(previous!==null&&row.currentOdometerKm<previous)throw new FuelOdometerError();previous=row.currentOdometerKm;}}}

/** Every closing Full owns its incoming interval. Legacy distances remain unconfirmed. */
export function rebuildFuelCycles(input:FuelCycleInput[]){
  const cycles=new Map<string,FuelCycle>();let baseline:FuelCycleInput|null=null,included:FuelCycleInput[]=[];
  for(const row of sorted(input)){
    if(!baseline){if(row.isFullTank===true){baseline=row;cycles.set(row.id,{previousFullRefuelId:null,includedRefuelIds:[],cycleFuelLiters:0,cycleDistanceKm:null,cycleKmPerLiter:null,cycleStatus:'AWAITING_NEXT_FULL'});}continue;}
    included.push(row);if(row.isFullTank!==true)continue;
    const liters=included.reduce((sum,value)=>sum+Number(value.liters),0);
    const confirmed=Boolean(row.distanceConfirmedAt)&&row.distanceStartRefuelId===baseline.id&&['TRIP_A','MANUAL','ODOMETER_CONFIRMED'].includes(row.distanceSource??'');
    let distance=confirmed?Number(row.actualDistanceKm):null;
    const odoDelta=row.currentOdometerKm!==null&&baseline.currentOdometerKm!==null?row.currentOdometerKm-baseline.currentOdometerKm:null;
    const review=included.some(value=>value.isFullTank===null||!Number.isFinite(Number(value.liters))||Number(value.liters)<=0)||!Number.isFinite(liters)||liters<=0||confirmed&&(!Number.isFinite(distance)||!distance||distance<0||row.distanceSource==='ODOMETER_CONFIRMED'&&odoDelta!==distance);
    if(review)distance=null;
    cycles.set(row.id,{previousFullRefuelId:baseline.id,includedRefuelIds:included.map(value=>value.id),cycleFuelLiters:liters,cycleDistanceKm:distance,cycleKmPerLiter:distance&&distance>0?distance/liters:null,cycleStatus:review?'NEEDS_REVIEW':distance&&distance>0?'CALCULATED':'AWAITING_ACTUAL_DISTANCE'});
    baseline=row;included=[];
  }
  return cycles;
}
/** Shared compatibility path for consumers of calculated results only. */
export function calculateFuelCycles(input:FuelCycleInput[]){const valid=new Map<string,FuelCycleResult>();for(const [id,cycle]of rebuildFuelCycles(input)){if(cycle.cycleStatus==='CALCULATED'&&cycle.previousFullRefuelId&&cycle.cycleDistanceKm&&cycle.cycleKmPerLiter)valid.set(id,{previousFullRefuelId:cycle.previousFullRefuelId,cycleDistanceKm:cycle.cycleDistanceKm,cycleFuelLiters:cycle.cycleFuelLiters,cycleKmPerLiter:Number(cycle.cycleKmPerLiter.toFixed(2))});}return valid;}
