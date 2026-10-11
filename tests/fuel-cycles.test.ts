import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFuelCycles,FuelOdometerError,type FuelCycleInput} from '../src/lib/fuel-cycles.ts';

const row=(id:string,date:string,odometer:number,liters:number,isFullTank:boolean|null):FuelCycleInput=>({id,date,createdAt:`${date}T12:00:00Z`,currentOdometerKm:odometer,liters,isFullTank});

test('full-to-full uses the closing refill and not the starting refill',()=>{
  const cycles=calculateFuelCycles([row('start','2026-09-20',86000,39.5,true),row('end','2026-09-29',86293,31.5,true)]);
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
  assert.throws(()=>calculateFuelCycles([row('first','2026-09-01',100000,40,true),row('second','2026-09-02',99999,20,false)]),FuelOdometerError);
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
 const entries=[{...row('start','2026-10-01',0,40,true),currentOdometerKm:null,distanceMode:'trip'},row('middle','2026-10-02',100000,20,true),row('end','2026-10-03',100200,20,true)];
 assert.equal(calculateFuelCycles(entries).has('middle'),false);assert.equal(calculateFuelCycles(entries).get('end')?.cycleKmPerLiter,10);
});
