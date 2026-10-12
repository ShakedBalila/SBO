import {test} from 'node:test';
import assert from 'node:assert/strict';
import {vehicleMonthCosts} from '../src/lib/vehicle-costs.ts';
const fuel=[{id:'start',date:'2026-10-01',totalCost:200},{id:'end',date:'2026-10-31',totalCost:620,previousFullRefuelId:'start',cycleDistanceKm:1000}];
const washes=[{id:'a',type:'CarWash',date:'2026-10-04',amount:60},{id:'b',type:'CarWash',date:'2026-10-19',amount:75}];
const calculate=(expenses:Record<string,unknown>[],month='2026-10')=>vehicleMonthCosts({month,fuel,policies:[],reminders:[],expenses});
test('one-time washes join financial costs exactly and do not repeat in the next month',()=>{
 const value=calculate([...washes,{type:'Parking',date:'2026-10-02',amount:90}]);
 assert.equal(value.carWashes,135);assert.equal(value.washCount,2);assert.equal(value.fuel,820);assert.equal(value.total,1045);assert.equal(value.costPerKm,null);
 assert.equal(calculate(washes,'2026-11').total,0);assert.equal(calculate(washes,'2026-11').washCount,0);
});
test('edits move only the actual expense between months, deletion recalculates, and cents remain exact',()=>{
 const edited=[{...washes[0],date:'2026-11-04',amount:65},washes[1]];
 assert.equal(calculate(edited).carWashes,75);assert.equal(calculate(edited,'2026-11').carWashes,65);
 assert.equal(calculate([washes[1]]).washCount,1);
 assert.equal(calculate([{type:'CarWash',date:'2026-10-04',amount:0.1},{type:'CarWash',date:'2026-10-04',amount:0.2}]).carWashes,0.3);
});
test('insurance and test expenses are preserved and distance crossing month boundaries does not invent monthly km',()=>{
 const value=vehicleMonthCosts({month:'2026-10',fuel:[{...fuel[0],date:'2026-09-30'},fuel[1]],policies:[{annualCost:1200,startDate:'2026-01-01',endDate:'2026-12-31'}],reminders:[{dueDate:'2026-10-04',licenseFee:100,testFee:50}],expenses:washes});
 assert.equal(value.insurance,100);assert.equal(value.maintenance,150);assert.equal(value.total,1005);assert.equal(value.distanceKm,0);assert.equal(value.costPerKm,null);
});
