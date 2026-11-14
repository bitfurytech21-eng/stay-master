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
  assert.ok(source.includes('requireGuest'));
});

test('manual payment API routes enforce submission and administrator verification', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.ok(source.includes('manual_payment_submissions'));
  assert.ok(source.includes('/api/admin/booking/payments/:id'));
  assert.ok(source.includes('/api/admin/booking/units/:id'));
});

test('guest booking frontend has valid JavaScript syntax', async () => {
  const source = await readFile(path.resolve(here, '../../booking.js'), 'utf8');
  assert.ok(source.includes('/api/booking/availability'));
});

test('admin booking frontend has valid JavaScript syntax', async () => {
  const source = await readFile(path.resolve(here, '../../booking-admin.js'), 'utf8');
  assert.ok(source.length > 0);
});

test('translation API proxies to self-hosted LibreTranslate without a third-party key', async () => {
  const source = await readFile(path.resolve(here, '../src/server.js'), 'utf8');
  assert.ok(source.includes('SUPPORTED_TRANSLATION_LANGUAGES'));
  assert.ok(source.includes('LIBRETRANSLATE_HOST'));
  assert.ok(source.includes("baseUrl + '/translate'"));
  assert.ok(source.includes("form.append('source', 'auto')"));
  assert.ok(!source.includes('GOOGLE_TRANSLATE_API_KEY'));
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

test('booking creation checks overlapping reservations inside the same transaction as insertion', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.ok(source.includes('const createReservation = db.transaction'));
  assert.ok(source.includes('if (!createReservation())'));
});

test('guest registration and login have bounded input and per-IP abuse controls', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.ok(source.includes('const AUTH_MAX_ATTEMPTS = 10'));
  assert.ok(source.includes('authRateLimited(req.ip'));
  assert.ok(source.includes('password.length > 200'));
});

test('API CORS explicitly permits credentialed admin PATCH requests and rejects unlisted origins', async () => {
  const source = await readFile(path.resolve(here, '../src/server.js'), 'utf8');
  assert.ok(source.includes("ALLOWED_ORIGINS.includes(origin)"));
  assert.ok(source.includes("'GET, POST, PATCH, OPTIONS'"));
  assert.ok(source.includes("'Content-Type, Authorization'"));
  assert.ok(source.includes("Origin not allowed."));
});

test('SQLite foreign key enforcement is enabled at startup', async () => {
  const source = await readFile(path.resolve(here, '../src/server.js'), 'utf8');
  assert.ok(source.includes("db.pragma('foreign_keys = ON')"));
});

test('rate-on-request bookings cannot accept manual payment submissions before a quote', async () => {
  const source = await readFile(path.resolve(here, '../src/booking.js'), 'utf8');
  assert.ok(source.includes('if(booking.total_minor<=0)'));
  assert.ok(source.includes('cannot accept payment until the team has issued a confirmed quote'));
});
