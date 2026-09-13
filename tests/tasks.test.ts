import assert from 'node:assert/strict';
import test from 'node:test';
import { taskInput, todayIn } from '../src/lib/tasks.ts';
import { hashPassword, verifyPassword } from '../src/lib/password.ts';
import { waterReminderDue } from '../src/lib/water-reminders.ts';
import { expectedWaterAt, waterTimeMarks } from '../src/lib/water-pacing.ts';
import { goalInput } from '../src/lib/modules.ts';
test('task validation rejects bad dates, blank titles and owner injection', () => {
  assert.equal(taskInput.safeParse({ title: '   ' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', startDate: '2026-02-30' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', userId: 'another-user' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', status: 'UNKNOWN' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', startDate: '2028-02-29',endDate:'2028-03-02' }).success, true);
  assert.equal(taskInput.safeParse({ title:'Backwards',startDate:'2028-03-02',endDate:'2028-02-29' }).success,false);
});
test('recurring tasks require only valid recurrence values', () => {
  assert.equal(taskInput.parse({ title: 'New task' }).status, 'IN_PROGRESS');
  assert.equal(taskInput.safeParse({ title: 'Daily habit', startDate: '2026-09-12', recurrence: 'DAILY' }).success, true);
  assert.equal(taskInput.safeParse({ title: 'Bad habit', recurrence: 'MONTHLY' }).success, false);
  assert.equal(taskInput.safeParse({ title:'Annual',startDate:'2026-09-12',recurrence:'YEARLY' }).success,true);
  assert.equal(taskInput.safeParse({ title:'Custom',startDate:'2026-09-12',recurrence:'CUSTOM',recurrenceDays:[] }).success,false);
});
test('today follows the user timezone at a UTC date boundary', () => {
  const now = new Date('2026-09-11T22:30:00Z');
  assert.equal(todayIn('Asia/Jerusalem', now), '2026-09-12');
  assert.equal(todayIn('America/New_York', now), '2026-09-11');
});
test('passwords are salted and verified without storing plaintext', async () => {
  const a = await hashPassword('a long testing password');
  const b = await hashPassword('a long testing password');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('a long testing password', a), true);
  assert.equal(await verifyPassword('wrong password', a), false);
});
test('water reminders run only on the chosen interval and inside the daily window', () => {
  assert.equal(waterReminderDue(8, 0, '08:00', '16:00', 60), true);
  assert.equal(waterReminderDue(10, 0, '08:00', '16:00', 120), true);
  assert.equal(waterReminderDue(9, 0, '08:00', '16:00', 120), false);
  assert.equal(waterReminderDue(16, 0, '08:00', '16:00', 60), true);
  assert.equal(waterReminderDue(16, 1, '08:00', '16:00', 60), false);
});
test('water pacing uses a separate whole-hour schedule with two or four hour intervals', () => {
  assert.deepEqual(waterTimeMarks('08:00','20:00',4),[480,720,960,1200]);
  assert.equal(expectedWaterAt(2000,840,'08:00','20:00'),1000);
  assert.equal(expectedWaterAt(2000,1260,'08:00','20:00'),2000);
  assert.equal(goalInput.safeParse({waterGoalMl:2000,waterDayStart:'08:00',waterDayEnd:'20:00',waterPaceIntervalHours:2}).success,true);
  assert.equal(goalInput.safeParse({waterDayStart:'08:30',waterDayEnd:'20:00',waterPaceIntervalHours:2}).success,false);
  assert.equal(goalInput.safeParse({waterDayStart:'08:00',waterDayEnd:'20:00',waterPaceIntervalHours:3}).success,false);
});
