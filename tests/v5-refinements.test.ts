import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workDurations,monthlyWorkWeeks,annualSundayWeek,type WorkEntryRow} from '../src/lib/work-calculations.ts';
import {emptyPhotoMeal,photoMealTotals,mergeMealDraft,mealInput,type Ingredient} from '../src/lib/food-photo.ts';
import {workoutCalendarDates,shiftWorkoutMonth,changeDefaultReps,starterPlan} from '../src/lib/workouts.ts';
import {localClockInstant,notificationIsDue,scheduledNotification} from '../src/lib/notification-schedule.ts';
import {eventChipStyle} from '../src/lib/event-colors.ts';

const entry:WorkEntryRow={id:'one',date:'2026-10-01',type:'WORK',startedAt:'2026-10-01T05:00:00Z',endedAt:null,breakMinutes:0,pausedAt:'2026-10-01T07:00:00Z',overtimeApproved:false,distanceKm:0,notes:'',tripId:null};
test('presence keeps counting while unpaid net work pauses; paid break keeps net work running',()=>{
 const now=Date.parse('2026-10-01T07:30:00Z');
 const unpaid=workDurations({...entry,breakSegments:[{startedAt:entry.pausedAt!,endedAt:null,paid:false}]},now);assert.equal(unpaid.presence,150);assert.equal(unpaid.net,120);assert.equal(unpaid.unpaid,30);
 const paid=workDurations({...entry,breakSegments:[{startedAt:entry.pausedAt!,endedAt:null,paid:true}]},now);assert.equal(paid.presence,150);assert.equal(paid.net,150);assert.equal(paid.paid,30);
});
test('closed break segments preserve seconds, legacy breaks, reload and stop-at-break arithmetic',()=>{
 const e={...entry,endedAt:'2026-10-01T14:00:00Z',pausedAt:null,breakMinutes:50,breakSegments:[{startedAt:'2026-10-01T07:00:00Z',endedAt:'2026-10-01T07:20:00Z',paid:false},{startedAt:'2026-10-01T10:00:00Z',endedAt:'2026-10-01T10:10:00Z',paid:true}]};
 assert.deepEqual(workDurations(e),{presence:540,net:490,paid:10,unpaid:50,breakTotal:60});
});
test('Sunday annual week groups have only selected-month days and handle 4, 5, 6 rows and year boundaries',()=>{
 assert.equal(monthlyWorkWeeks('2026-02').length,4);assert.equal(monthlyWorkWeeks('2026-10').length,5);assert.equal(monthlyWorkWeeks('2026-05').length,6);
 for(const month of ['2026-12','2027-01']){const dates=monthlyWorkWeeks(month).flatMap(w=>w.dates);assert.equal(dates.length,31);assert.equal(new Set(dates).size,31);assert.ok(dates.every(d=>d.startsWith(month)));}
 assert.deepEqual(annualSundayWeek('2027-01-01'),{year:2027,week:1});assert.deepEqual(annualSundayWeek('2027-01-03'),{year:2027,week:2});
});
test('workout week/month ranges and single default reps preserve explicit legacy overrides',()=>{
 assert.equal(workoutCalendarDates('2026-02-15','week').length,7);assert.equal(workoutCalendarDates('2026-02-15','month').length,28);assert.equal(workoutCalendarDates('2026-05-15','month').length,42);assert.equal(shiftWorkoutMonth('2026-10-31',1),'2026-11-30');
 assert.deepEqual(changeDefaultReps(['8','8','10'],'12',3),['12','12','10']);assert.ok(starterPlan().content.days.every(d=>d.exercises.every(e=>e.restSeconds===60&&e.notes==='')));
});
const food:Ingredient={id:'rice',name:'אורז',quantity:200,unit:'grams',gramsPerServing:100,preparation:'cooked',measured:false,notes:'',basis:{foodKey:'catalog:rice',name:'אורז מבושל',source:'מאגר בדיקה',calories:130,proteinG:2.7,carbsG:28,fatG:.3}};
test('photo meal arithmetic is per 100g, scales servings/batch weight and never treats unknown ingredients as zero',()=>{
 const meal={...emptyPhotoMeal('2026-10-15'),name:'אורז',ingredients:[food],recipeServings:2,consumedServings:1};let totals=photoMealTotals(meal);assert.equal(totals.calories,130);assert.equal(totals.proteinG,2.7);assert.equal(totals.estimated,true);assert.equal(totals.complete,true);
 totals=photoMealTotals({...meal,batchGrams:400,consumedGrams:100});assert.equal(totals.calories,65);assert.equal(photoMealTotals({...meal,ingredients:[{...food,basis:null}]}).complete,false);assert.equal(photoMealTotals(emptyPhotoMeal('2026-10-15')).complete,false);
});
test('draft edits cannot inject nutrition provenance and recipe snapshots remain independent',()=>{
 const old={...emptyPhotoMeal('2026-10-15'),name:'ארוחה',ingredients:[food]};const edited=mealInput({...old,ingredients:[{...food,quantity:100}]});const merged=mergeMealDraft(edited,old);assert.equal(merged.ingredients[0].basis?.calories,130);assert.equal(old.ingredients[0].quantity,200);assert.equal(mergeMealDraft(edited).ingredients[0].basis,null);
});
test('event backgrounds retain exact colors and bright fills receive dark contrast text',()=>{
 assert.deepEqual(eventChipStyle('#EFF6FC'),{'--event-color':'#eff6fc','--event-foreground':'#071722'});
});
test('Israel DST gap is not shifted to another hour and exact reminders do not introduce pre-alerts',()=>{
 assert.ok(Number.isNaN(localClockInstant('2026-03-27','02:30','Asia/Jerusalem').valueOf()));const due=scheduledNotification({date:'2026-10-25',time:'09:00',timeZone:'Asia/Jerusalem'});assert.equal(due.toISOString(),'2026-10-25T07:00:00.000Z');assert.equal(notificationIsDue(new Date(due.valueOf()-900000),due),false);
});
