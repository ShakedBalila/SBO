type Row=Record<string,unknown>;
export const washTypes={Exterior:'חיצונית',InteriorExterior:'פנים וחוץ',Premium:'פרימיום',Detailing:'דיטיילינג',Other:'אחר'};
const date=(value:unknown)=>value instanceof Date?value.toISOString().slice(0,10):String(value??'');
const cents=(value:unknown)=>Math.round(Number(value??0)*100);
export function vehicleMonthCosts({month,fuel,policies,reminders,expenses}:{month:string;fuel:Row[];policies:Row[];reminders:Row[];expenses:Row[]}){
 const amounts={fuel:0,carWashes:0,insurance:0,maintenance:0,parking:0,other:0};
 let washCount=0,distanceKm=0;
 const byId=new Map(fuel.map(row=>[String(row.id),row]));
 for(const row of fuel){if(date(row.date).slice(0,7)!==month)continue;amounts.fuel+=row.totalCost!==null&&row.totalCost!==undefined?cents(row.totalCost):cents(Number(row.liters)*Number(row.pricePerLiter));
  const baseline=byId.get(String(row.previousFullRefuelId));if(baseline&&date(baseline.date).slice(0,7)===month&&Number(row.cycleDistanceKm)>0)distanceKm+=Number(row.cycleDistanceKm);
 }
 for(const row of policies){if(month>=date(row.startDate).slice(0,7)&&month<=date(row.endDate).slice(0,7))amounts.insurance+=cents(Number(row.annualCost)/12);}
 for(const row of reminders){if(date(row.dueDate).slice(0,7)===month)amounts.maintenance+=cents(row.licenseFee)+cents(row.testFee);}
 for(const row of expenses){if(date(row.date).slice(0,7)!==month)continue;const value=cents(row.amount);
  if(row.type==='CarWash'){amounts.carWashes+=value;washCount++;}
  else if(['Maintenance','Repair','Test'].includes(String(row.type)))amounts.maintenance+=value;
  else if(['Parking','Tolls'].includes(String(row.type)))amounts.parking+=value;
  else amounts.other+=value;
 }
 const total=Object.values(amounts).reduce((sum,value)=>sum+value,0)/100;
 return {...Object.fromEntries(Object.entries(amounts).map(([key,value])=>[key,value/100])) as {[K in keyof typeof amounts]:number},washCount,distanceKm,total,costPerKm:null as number|null};
}
