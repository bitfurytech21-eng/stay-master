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
