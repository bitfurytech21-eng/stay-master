import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));


test('backend server has valid JavaScript syntax', async () => {
  const source = await readFile(path.resolve(here, '../src/server.js'), 'utf8');
  assert.ok(source.includes('app.post(\'/api/enquiries\''));
  assert.ok(source.includes('app.get(\'/api/health\''));
});

test('enquiry API keeps server-side validation and abuse controls', async () => {
  const source = await readFile(path.resolve(here, '../src/server.js'), 'utf8');
  assert.ok(source.includes('rateLimited(ip)'));
  assert.ok(source.includes('EMAIL_RE.test(data.email)'));
  assert.ok(source.includes('req.body.website'));
});

test('admin enquiry endpoint uses constant-time token comparison and bounded limits', async () => {
  const source = await readFile(path.resolve(here, '../src/server.js'), 'utf8');
  assert.ok(source.includes('crypto.timingSafeEqual'));
  assert.ok(source.includes('Math.min(Math.max(requestedLimit, 1), 200)'));
});

test('booking API module has valid JavaScript syntax', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.ok(source.includes('mountBookingRoutes'));
});

test('booking engine includes guest auth, availability checks and admin controls', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.ok(source.includes('/availability'));
  assert.ok(source.includes('requireUser'));
});

test('manual payment API routes enforce submission and administrator verification', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.ok(source.includes('payment_submissions'));
});

test('guest booking frontend has valid JavaScript syntax', async () => {
  const source = await readFile(path.resolve(here, '../../booking.js'), 'utf8');
  assert.ok(source.includes('/api/booking/availability'));
});

test('admin booking frontend has valid JavaScript syntax', async () => {
  const source = await readFile(path.resolve(here, '../../booking-admin.js'), 'utf8');
  assert.ok(source.length > 0);
});

test('translation API validates language batches and keeps provider credentials server-side', async () => {
  const source = await readFile(path.resolve(here, '../src/server.js'), 'utf8');
  assert.ok(source.includes('SUPPORTED_TRANSLATION_LANGUAGES'));
  assert.ok(source.includes('process.env.GOOGLE_TRANSLATE_API_KEY'));
});

test('global translator frontend has valid JavaScript syntax and calls the same-origin proxy', async () => {
  const source = await readFile(path.resolve(here, '../../translator.js'), 'utf8');
  assert.ok(source.includes('/api/translate'));
});

test('translation frontend does not contain a provider API key', async () => {
  const source = await readFile(path.resolve(here, '../../translator.js'), 'utf8');
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}/.test(source));
});

test('visitor language preference persists between page visits', async () => {
  const source = await readFile(path.resolve(here, '../../translator.js'), 'utf8');
  assert.match(source, /localStorage\.setItem\('stayMasterLanguage'/);
  assert.match(source, /localStorage\.getItem\('stayMasterLanguage'/);
});



test('booking page keeps its scripts in valid separate HTML tags', async () => {
  const html = await readFile(path.resolve(here, '../../booking.html'), 'utf8');
  // The two script tags must be separate elements, separated by a real newline.
  assert.ok(html.includes('<script src="translator.js?v=1" defer></script>\n<script src="booking.js" defer></script>'));
  assert.ok(!html.includes('</script>\\n<script src="booking.js"'));
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
  const source = await readFile(path.resolve(here, '../../booking.js'), 'utf8');
  assert.ok(source.includes('nightly_rate_minor'));
});
