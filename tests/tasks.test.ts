import assert from 'node:assert/strict';
import test from 'node:test';
import { taskInput, todayIn } from '../src/lib/tasks.ts';
import { hashPassword, verifyPassword } from '../src/lib/password.ts';
test('task validation rejects bad dates, blank titles and owner injection', () => {
  assert.equal(taskInput.safeParse({ title: '   ' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', dueDate: '2026-02-30' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', userId: 'another-user' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', status: 'UNKNOWN' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'Hello', dueDate: '2028-02-29' }).success, true);
});
test('recurring tasks require only valid recurrence values', () => {
  assert.equal(taskInput.safeParse({ title: 'Daily habit', dueDate: '2026-09-12', recurrence: 'DAILY' }).success, true);
  assert.equal(taskInput.safeParse({ title: 'Bad habit', recurrence: 'MONTHLY' }).success, false);
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
