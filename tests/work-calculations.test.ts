import {test} from 'node:test';
import assert from 'node:assert/strict';
import {vacationBalance,tripSummary,localInstant,monthSummary,shiftMinutes,workDefaults,type WorkEntryRow} from '../src/lib/work-calculations.ts';
const contract={...workDefaults,employmentStartDate:'2026-10-01',baseSalary:16000,standardMinutes:504,defaultBreakMinutes:30,contributionBasePercent:90,mealPerDay:37,travelAllowance:500,vacationDays:15,sickPayPercent:100};
const entry=(extra:Partial<WorkEntryRow>={}):WorkEntryRow=>({id:'one',date:'2026-10-01',type:'WORK',startedAt:'2026-10-01T05:00:00Z',endedAt:'2026-10-01T13:54:00Z',breakMinutes:30,pausedAt:null,overtimeApproved:false,distanceKm:0,notes:'',tripId:null,...extra});
test('8:24 contract excludes break, meals require actual work, and sick leave is not a worked day',()=>{
  const normal=entry(),sick=entry({id:'sick',date:'2026-10-04',type:'SICK',startedAt:null,endedAt:null}),result=monthSummary([normal,sick],'2026-10',contract);
  assert.equal(shiftMinutes(normal),504);assert.equal(result.workedDays,1);assert.equal(result.sickDays,1);assert.equal(result.meals,37);assert.equal(result.gross,16500);assert.equal(result.socialBase,14400);
  const halfPay=monthSummary([normal,sick],'2026-10',{...contract,sickPayPercent:50});assert.ok(Math.abs(halfPay.gross-(16500-16000/182*8.4*.5))<0.000001);
});
test('overtime is paid only when approved, across editable daily tiers and multiple shifts',()=>{
  const long=entry({endedAt:'2026-10-01T16:00:00Z'}),none=monthSummary([long],'2026-10',contract);assert.equal(none.overtimePay,0);
  const approved=monthSummary([{...long,overtimeApproved:true}],'2026-10',contract);assert.equal(approved.approvedMinutes,126);assert.ok(Math.abs(approved.overtimePay-(16000/182/60*(120*1.25+6*1.5)))<0.000001);
  const split=monthSummary([entry({endedAt:'2026-10-01T10:00:00Z',breakMinutes:0}),entry({id:'two',startedAt:'2026-10-01T11:00:00Z',endedAt:'2026-10-01T16:30:00Z',breakMinutes:0,overtimeApproved:true})],'2026-10',contract);assert.equal(split.approvedMinutes,126);
});
test('pause freezes work timer and time conversion respects Jerusalem daylight saving',()=>{
  assert.equal(shiftMinutes(entry({endedAt:null,pausedAt:'2026-10-01T07:00:00Z',breakMinutes:0}),Date.parse('2026-10-01T12:00:00Z')),120);
  assert.equal(localInstant('2026-10-05','08:00','Asia/Jerusalem').toISOString(),'2026-10-05T05:00:00.000Z');assert.equal(localInstant('2026-12-05','08:00','Asia/Jerusalem').toISOString(),'2026-12-05T06:00:00.000Z');
});

test('new contract has no salary, vacation or contribution defaults and no established deficit',()=>{
 const result=monthSummary([],'2026-10',workDefaults,Date.parse('2026-10-11T12:00:00Z'));
 assert.equal(result.salaryReady,false);assert.equal(result.gross,0);assert.equal(result.deficitMinutes,0);assert.equal(result.unreportedDays,0);
 assert.equal(workDefaults.baseSalary,0);assert.equal(workDefaults.vacationDays,0);assert.equal(workDefaults.employeePensionPercent,0);
});
test('partial month applies employment boundaries and editable calendar or working-day fractions',()=>{
 const partial={...contract,employmentStartDate:'2026-10-15',employmentEndDate:'2026-10-25'};
 const result=monthSummary([],'2026-10',partial,Date.parse('2026-10-31T12:00:00Z'));
 const total=result.days.filter(d=>partial.workDays.includes(new Date(d.date).getUTCDay())).length;
 const worked=result.days.filter(d=>d.date>=partial.employmentStartDate&&d.date<=partial.employmentEndDate&&partial.workDays.includes(new Date(d.date).getUTCDay())).length;
 assert.equal(result.basePay,16000*worked/total);assert.equal(result.travelPay,500*worked/total);
 const calendar=monthSummary([],'2026-10',{...partial,prorationMode:'calendarDays',prorateTravel:false});assert.equal(calendar.periodFraction,11/31);assert.equal(calendar.travelPay,500);
 assert.equal(monthSummary([],'2026-09',partial).salaryReady,false);
});
test('unreported expected days are separate from short completed shifts and exclude employment exterior and today',()=>{
 const now=Date.parse('2026-10-11T12:00:00Z'),result=monthSummary([entry({endedAt:'2026-10-01T09:00:00Z',breakMinutes:0})],'2026-10',contract,now);
 assert.equal(result.deficitMinutes,264);assert.equal(result.unreportedDays,5);
 const missing=monthSummary([],'2026-10',contract,now);assert.equal(missing.hasRecords,false);assert.equal(missing.deficitMinutes,0);
});
test('vacation accrues at annual / 12 with proportional partial months and stops at employment end',()=>{
 const c={...contract,employmentStartDate:'2026-09-16',employmentEndDate:'2026-10-10'};
 const result=vacationBalance([],'2026',c,'2026-10-31');assert.equal(result.accrued,Number((15/12*(15/30+10/31)).toFixed(2)));
 assert.equal(vacationBalance([],'2025',c,'2026-10-31').accrued,0);
 assert.equal(vacationBalance([entry({type:'VACATION',date:'2026-09-01'}),entry({type:'VACATION',date:'2026-10-05'})],'2026',c,'2026-10-31').used,1);
});
test('trip summary handles same-day boundaries and partial departure and return allowances',()=>{
 const trip={id:'trip',destination:'Paris',startDate:'2026-10-01',endDate:'2026-10-03',status:'APPROVED',details:{perDiem:50,perDiemCurrency:'EUR',perDiemExchangeRate:4,departureFactor:.5,returnFactor:.5}};
 assert.equal(tripSummary(trip,[]).days,3);assert.equal(tripSummary(trip,[]).eligibleDays,2);assert.equal(tripSummary(trip,[]).total,400);
 assert.equal(tripSummary({...trip,endDate:trip.startDate},[]).eligibleDays,.5);
});
