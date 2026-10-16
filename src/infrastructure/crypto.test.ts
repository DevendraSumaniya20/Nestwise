import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, newJoinCode, newResetCode, safeEqualHex, sha256, verifyPassword } from './crypto.ts';

test('password hashes verify only the right password', async () => {
  const stored = await hashPassword('correct horse');
  assert.notEqual(stored, await hashPassword('correct horse')); // salted
  assert.equal(await verifyPassword('correct horse', stored), true);
  assert.equal(await verifyPassword('wrong', stored), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
});

test('codes have the right shape', () => {
  assert.match(newResetCode(), /^\d{6}$/);
  assert.match(newJoinCode(), /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(safeEqualHex(sha256('a'), sha256('a')), true);
  assert.equal(safeEqualHex(sha256('a'), sha256('b')), false);
});
