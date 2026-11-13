import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(here, '../src/server.js');

test('backend server has valid JavaScript syntax', () => {
  const result = spawnSync(process.execPath, ['--check', serverPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('enquiry API keeps server-side validation and abuse controls', async () => {
  const source = await readFile(serverPath, 'utf8');
  assert.match(source, /function validate\(body\)/);
  assert.match(source, /EMAIL_RE\.test\(data\.email\)/);
  assert.match(source, /Departure cannot be before arrival/);
  assert.match(source, /function rateLimited\(ip\)/);
  assert.match(source, /req\.body\.website/);
});

test('admin enquiry endpoint uses constant-time token comparison and bounded limits', async () => {
  const source = await readFile(serverPath, 'utf8');
  assert.match(source, /crypto\.timingSafeEqual\(givenToken, expectedToken\)/);
  assert.match(source, /Math\.min\(Math\.max\(requestedLimit, 1\), 200\)/);
});

test('booking API module has valid JavaScript syntax', () => {
  const bookingPath = path.resolve(here, '../src/booking.js');
  const result = spawnSync(process.execPath, ['--check', bookingPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('booking engine includes guest auth, availability checks and admin controls', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.match(source, /scryptSync/);
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /\/api\/auth\/register/);
  assert.match(source, /\/api\/booking\/availability/);
  assert.match(source, /\/api\/bookings\/mine/);
  assert.match(source, /\/api\/admin\/booking\/reservations/);
  assert.match(source, /payment_status/);
});
