import assert from 'node:assert/strict';
import test from 'node:test';
import { weekEventSegments, calendarOccurrence } from '../src/lib/calendar-occurrence.ts';
import { nutritionTargets } from '../src/lib/nutrition-targets.ts';
import { eventInput } from '../src/lib/modules.ts';

test('event ranges persist optional dates and reject reversed dates',()=>{
  assert.equal(eventInput.parse({title:'Trip',date:'2026-09-18',endDate:'2026-09-22'}).endDate,'2026-09-22');
  assert.equal(eventInput.parse({title:'Trip',date:'2026-09-18',endDate:null}).endDate,null);
  assert.equal(eventInput.safeParse({title:'Trip',date:'2026-09-18',endDate:'2026-09-17'}).success,false);
});
test('multi-day events form a single weekly bar and overlapping events use separate lanes',()=>{
  const week=['2026-09-13','2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-19'];
  const events=[{id:'a',date:'2026-09-12',endDate:'2026-09-15'},{id:'b',date:'2026-09-14',endDate:'2026-09-18'},{id:'c',date:'2026-09-19',endDate:'2026-09-22'}];
  assert.deepEqual(weekEventSegments(events,week).map(({item,start,end,lane})=>({id:item.id,start,end,lane})),[{id:'a',start:0,end:2,lane:0},{id:'b',start:1,end:5,lane:1},{id:'c',start:6,end:6,lane:0}]);
  assert.equal(calendarOccurrence(events[0],'2026-09-16').occurs,false);
  assert.equal(calendarOccurrence({...events[0],recurrence:'WEEKLY'},'2026-09-20').occurs,true);
});
test('automatic targets require a complete profile and respond to activity, weight and goal changes',()=>{
  assert.equal(nutritionTargets({age:30}),null);
  const profile={age:30,sex:'male',heightCm:180,weightKg:80,activityLevel:'moderate',weightGoal:'maintain'};
  assert.deepEqual(nutritionTargets(profile),{bmr:1780,tdee:2759,calorieGoal:2759,proteinGoalG:128});
  assert.equal(nutritionTargets({...profile,weightGoal:'lose'})?.calorieGoal,2259);
  assert.equal(nutritionTargets({...profile,weightGoal:'gain'})?.proteinGoalG,144);
  assert.notEqual(nutritionTargets({...profile,weightKg:85})?.calorieGoal,2759);
});
