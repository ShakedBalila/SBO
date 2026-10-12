import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFuelCycles,rebuildFuelCycles,validateFuelOdometers,FuelOdometerError,type FuelCycleInput} from '../src/lib/fuel-cycles.ts';

const row=(id:string,date:string,odometer:number,liters:number,isFullTank:boolean|null):FuelCycleInput=>({id,date,createdAt:`${date}T12:00:00Z`,currentOdometerKm:odometer,liters,isFullTank,...(id==='end'?{distanceStartRefuelId:'start',distanceSource:'TRIP_A',distanceConfirmedAt:'2026-10-12T00:00:00Z',actualDistanceKm:odometer-100000}: {})});

test('full-to-full uses the closing refill and not the starting refill',()=>{
  const cycles=calculateFuelCycles([row('start','2026-09-20',86000,39.5,true),{...row('end','2026-09-29',86293,31.5,true),actualDistanceKm:293}]);
  assert.deepEqual(cycles.get('end'),{previousFullRefuelId:'start',cycleDistanceKm:293,cycleFuelLiters:31.5,cycleKmPerLiter:9.3});
  assert.equal(cycles.has('start'),false);
});

test('partial refuels accumulate until the next full tank',()=>{
  const cycles=calculateFuelCycles([row('start','2026-09-01',100000,40,true),row('partial','2026-09-10',100200,10,false),row('end','2026-09-20',100450,25,true)]);
  assert.deepEqual(cycles.get('end'),{previousFullRefuelId:'start',cycleDistanceKm:450,cycleFuelLiters:35,cycleKmPerLiter:12.86});
  assert.equal(cycles.has('partial'),false);
});

test('first full tank and unclassified legacy rows do not create a consumption result',()=>{
  assert.equal(calculateFuelCycles([row('only','2026-09-01',100000,40,true)]).size,0);
  assert.equal(calculateFuelCycles([row('start','2026-09-01',100000,40,true),row('legacy','2026-09-10',100200,10,null),row('end','2026-09-20',100450,25,true)]).size,0);
});

test('editing into a decreasing odometer sequence is rejected',()=>{
  assert.throws(()=>validateFuelOdometers([row('first','2026-09-01',100000,40,true),row('second','2026-09-02',99999,20,false)]),FuelOdometerError);
});

test('database Date objects are sorted chronologically across weekdays and months',()=>{
  const entries=[row('start','2026-09-30',100000,40,true),row('partial','2026-10-01',100100,10,false),row('end','2026-10-02',100350,25,true)]
    .reverse().map(entry=>({...entry,date:new Date(entry.date),createdAt:new Date(entry.createdAt)}));
  assert.equal(calculateFuelCycles(entries).get('end')?.cycleKmPerLiter,10);
});

test('Trip A closes a cycle without odometer readings and includes every partial refill',()=>{
 const entries=[{...row('start','2026-10-01',0,40,true),currentOdometerKm:null,distanceMode:'trip'}, {...row('partial','2026-10-02',0,10,false),currentOdometerKm:null,distanceMode:'trip'}, {...row('end','2026-10-03',0,21.5,true),currentOdometerKm:null,distanceMode:'trip',actualDistanceKm:293}];
 assert.equal(calculateFuelCycles(entries).get('end')?.cycleKmPerLiter,9.3);assert.equal(calculateFuelCycles(entries).get('end')?.cycleFuelLiters,31.5);
 assert.equal(calculateFuelCycles(entries.slice(0,2)).size,0);
});
test('switching to odometer without a previous odometer establishes a new baseline',()=>{
 const entries=[{...row('start','2026-10-01',0,40,true),currentOdometerKm:null,distanceMode:'trip'},row('middle','2026-10-02',100000,20,true),{...row('end','2026-10-03',100200,20,true),distanceStartRefuelId:'middle',actualDistanceKm:200}];
 assert.equal(calculateFuelCycles(entries).has('middle'),false);assert.equal(calculateFuelCycles(entries).get('end')?.cycleKmPerLiter,10);
});

test('unconfirmed odometer and legacy Trip A stay pending despite existing actual kilometers',()=>{
 for(const distanceMode of ['trip','odometer']){const rows=[row('start','2026-10-01',100000,40,true),{...row('end','2026-10-02',100293,31.5,true),distanceMode,distanceConfirmedAt:null}];assert.equal(calculateFuelCycles(rows).size,0);assert.equal(rebuildFuelCycles(rows).get('end')?.cycleStatus,'AWAITING_ACTUAL_DISTANCE');}
});
test('pending cycles are independent and weighted economy uses total kilometers / liters',()=>{
 const rows=[row('start','2026-09-20',100000,39.5,true),{...row('end','2026-09-29',100293,31.5,true),actualDistanceKm:293}, {...row('third','2026-10-09',100637,34,true),actualDistanceKm:344,distanceStartRefuelId:'end',distanceSource:'MANUAL',distanceConfirmedAt:'2026-10-12'}];
 const values=[...calculateFuelCycles(rows).values()];assert.equal((values.reduce((n,r)=>n+r.cycleDistanceKm,0)/values.reduce((n,r)=>n+r.cycleFuelLiters,0)).toFixed(2),'9.73');assert.equal(calculateFuelCycles(rows.slice(0,2)).size,1);assert.equal(rebuildFuelCycles([{...rows[0]}, {...rows[1],distanceConfirmedAt:null},rows[2]]).get('end')?.cycleStatus,'AWAITING_ACTUAL_DISTANCE');assert.equal(calculateFuelCycles([{...rows[0]}, {...rows[1],distanceConfirmedAt:null},rows[2]]).size,1);
});
test('a changed full boundary does not carry a measurement to another endpoint pair',()=>{
 const rows=[row('start','2026-10-01',100000,40,true),row('new','2026-10-02',100100,10,true),row('end','2026-10-03',100450,20,true)];assert.equal(calculateFuelCycles(rows).size,0);assert.equal(rebuildFuelCycles(rows).get('end')?.previousFullRefuelId,'new');assert.equal(rebuildFuelCycles(rows).get('end')?.cycleStatus,'AWAITING_ACTUAL_DISTANCE');
});
test('partial edit/delete recomputes included liters; invalid data is never authoritative',()=>{
 const rows=[row('start','2026-10-01',100000,40,true),row('p1','2026-10-05',100100,10,false),row('p2','2026-10-10',100200,15,false),row('end','2026-10-15',100450,20,true)];assert.equal(calculateFuelCycles(rows).get('end')?.cycleKmPerLiter,10);assert.equal(calculateFuelCycles(rows.filter(row=>row.id!=='p1')).get('end')?.cycleFuelLiters,35);for(const bad of [0,-1,NaN,Infinity])assert.equal(calculateFuelCycles([...rows.slice(0,-1),{...rows.at(-1)!,actualDistanceKm:bad}]).size,0);
});
test('same day ordering is deterministic and confirmed odometer source must match the delta',()=>{
 const rows=[{...row('start','2026-10-01',100000,40,true),createdAt:'2026-10-01T08:00:00Z'},{...row('end','2026-10-01',100293,31.5,true),createdAt:'2026-10-01T09:00:00Z',distanceSource:'ODOMETER_CONFIRMED',actualDistanceKm:293}];assert.equal(calculateFuelCycles(rows.reverse()).get('end')?.cycleKmPerLiter,9.3);assert.equal(rebuildFuelCycles(rows.map(row=>row.id==='end'?{...row,actualDistanceKm:600}:row)).get('end')?.cycleStatus,'NEEDS_REVIEW');
});
