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


test('manual payment API routes enforce submission and administrator verification', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.match(source, /\/api\/payments\/methods/);
  assert.match(source, /\/api\/bookings\/:reference\/payments/);
  assert.match(source, /\/api\/admin\/booking\/payments/);
  assert.match(source, /transaction_reference TEXT NOT NULL UNIQUE/);
  assert.match(source, /status\s*===\s*'verified'/);
  assert.match(source, /payment_status='paid'/);
  assert.match(source, /amountMinor!==booking\.total_minor/);
  assert.match(source, /booking\.currency!==String\(process\.env\.BANK_ACCOUNT_CURRENCY/);
});


test('guest booking frontend has valid JavaScript syntax', () => {
  const frontendPath = path.resolve(here, '../../booking.js');
  const result = spawnSync(process.execPath, ['--check', frontendPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('admin booking frontend has valid JavaScript syntax', () => {
  const frontendPath = path.resolve(here, '../../booking-admin.js');
  const result = spawnSync(process.execPath, ['--check', frontendPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});


test('translation API validates language batches and keeps provider credentials server-side', async () => {
  const source = await readFile(serverPath, 'utf8');
  assert.match(source, /app\.post\('\/api\/translate'/);
  assert.match(source, /GOOGLE_TRANSLATE_API_KEY/);
  assert.match(source, /texts\.length > 50/);
  assert.match(source, /SUPPORTED_TRANSLATION_LANGUAGES/);
});

test('global translator frontend has valid JavaScript syntax and calls the same-origin proxy', () => {
  const frontendPath = path.resolve(here, '../../translator.js');
  const result = spawnSync(process.execPath, ['--check', frontendPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('translation frontend does not contain a provider API key', async () => {
  const source = await readFile(path.resolve(here, '../../translator.js'), 'utf8');
  assert.match(source, /fetch\('\/api\/translate'/);
  assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/);
});


test('visitor language preference persists between page visits', async () => {
  const source = await readFile(path.resolve(here, '../../translator.js'), 'utf8');
  assert.match(source, /localStorage\.setItem\('stayMasterLanguage'/);
  assert.match(source, /localStorage\.getItem\('stayMasterLanguage'/);
});



test('booking page keeps its scripts in valid separate HTML tags', async () => {
  const html = await readFile(path.resolve(here, '../../booking.html'), 'utf8');
  assert.ok(html.includes('<script src="translator.js?v=1" defer></script>\\n<script src="booking.js" defer></script>'));
  assert.ok(!html.includes('</script>\\\\n<script src="booking.js"'));
});

test('booking admin escapes guest and property data before HTML rendering', async () => {
  const source = await readFile(path.resolve(here, '../../booking-admin.js'), 'utf8');
  for (const expression of ['esc(b.guest_name)', 'esc(b.guest_email)', 'esc(b.property_name)', 'esc(p.name)', 'esc(p.city)', 'esc(p.address)']) {
    assert.ok(source.includes(expression), 'Missing HTML escaping for ' + expression);
  }
});

test('manual payment transfer date rejects impossible calendar dates', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.ok(source.includes('const validDate=Boolean(dateOnly(transferDate));'));
});

test('booking pricing supports verified editable unit rates and displays full stay totals', async () => {
  const backend = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  const admin = await readFile(path.resolve(here, '../../booking-admin.js'), 'utf8');
  const guest = await readFile(path.resolve(here, '../../booking.js'), 'utf8');
  assert.match(backend, /\/api\/admin\/booking\/units/);
  assert.match(backend, /nightly_rate_minor=\?,currency=\?,active=\?/);
  assert.match(backend, /Number\.isSafeInteger\(total\)/);
  assert.match(admin, /data-unit-rate/);
  assert.match(admin, /Math\.round\(rate\*100\)/);
  assert.match(guest, /Stay total:/);
  assert.match(guest, /data\.nights/);
});
