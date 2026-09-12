import assert from 'node:assert/strict';
import test from 'node:test';
import { taskInput, todayIn } from '../src/lib/tasks.ts';
import { hashPassword, verifyPassword } from '../src/lib/password.ts';
test('task validation rejects bad dates, blank titles and owner injection', () => {
  assert.equal(taskInput.safeParse({ title: '   ' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', startDate: '2026-02-30' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', userId: 'another-user' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', status: 'UNKNOWN' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', startDate: '2028-02-29',endDate:'2028-03-02' }).success, true);
  assert.equal(taskInput.safeParse({ title:'Backwards',startDate:'2028-03-02',endDate:'2028-02-29' }).success,false);
});
test('recurring tasks require only valid recurrence values', () => {
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
