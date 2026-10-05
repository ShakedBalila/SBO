import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localInstant,monthSummary,shiftMinutes,workDefaults,type WorkEntryRow} from '../src/lib/work-calculations.ts';
const entry=(extra:Partial<WorkEntryRow>={}):WorkEntryRow=>({id:'one',date:'2026-10-01',type:'WORK',startedAt:'2026-10-01T05:00:00Z',endedAt:'2026-10-01T13:54:00Z',breakMinutes:30,pausedAt:null,overtimeApproved:false,distanceKm:0,notes:'',tripId:null,...extra});
test('8:24 contract excludes break, meals require actual work, and sick leave is not a worked day',()=>{
  const normal=entry(),sick=entry({id:'sick',date:'2026-10-04',type:'SICK',startedAt:null,endedAt:null}),result=monthSummary([normal,sick],'2026-10',workDefaults);
  assert.equal(shiftMinutes(normal),504);assert.equal(result.workedDays,1);assert.equal(result.sickDays,1);assert.equal(result.meals,37);assert.equal(result.gross,16500);assert.equal(result.socialBase,14400);
  const halfPay=monthSummary([normal,sick],'2026-10',{...workDefaults,sickPayPercent:50});assert.ok(Math.abs(halfPay.gross-(16500-16000/182*8.4*.5))<0.000001);
});
test('overtime is paid only when approved, across editable daily tiers and multiple shifts',()=>{
  const long=entry({endedAt:'2026-10-01T16:00:00Z'}),none=monthSummary([long],'2026-10',workDefaults);assert.equal(none.overtimePay,0);
  const approved=monthSummary([{...long,overtimeApproved:true}],'2026-10',workDefaults);assert.equal(approved.approvedMinutes,126);assert.ok(Math.abs(approved.overtimePay-(16000/182/60*(120*1.25+6*1.5)))<0.000001);
  const split=monthSummary([entry({endedAt:'2026-10-01T10:00:00Z',breakMinutes:0}),entry({id:'two',startedAt:'2026-10-01T11:00:00Z',endedAt:'2026-10-01T16:30:00Z',breakMinutes:0,overtimeApproved:true})],'2026-10',workDefaults);assert.equal(split.approvedMinutes,126);
});
test('pause freezes work timer and time conversion respects Jerusalem daylight saving',()=>{
  assert.equal(shiftMinutes(entry({endedAt:null,pausedAt:'2026-10-01T07:00:00Z',breakMinutes:0}),Date.parse('2026-10-01T12:00:00Z')),120);
  assert.equal(localInstant('2026-10-05','08:00','Asia/Jerusalem').toISOString(),'2026-10-05T05:00:00.000Z');assert.equal(localInstant('2026-12-05','08:00','Asia/Jerusalem').toISOString(),'2026-12-05T06:00:00.000Z');
});
