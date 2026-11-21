/**
 * Enquiry form backend for the master site.
 *
 * POST /api/enquiries  \u2014 accepts a contact-us form submission, validates it,
 *                        stores it in SQLite, and emails it to the agency.
 * GET  /api/health     \u2014 liveness probe for Render.
 * GET  /api/enquiries  \u2014 list stored enquiries (requires ADMIN_TOKEN).
 *
 * Design notes:
 *  - A submission is ALWAYS stored before mail is attempted, so a mail outage
 *    never loses a lead. The response reports whether the email went out.
 *  - If SMTP is not configured the server still stores and returns 201, but
 *    says mail is not configured, so the site never claims a message was sent
 *    when it was not.
 */
import express from 'express';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { mountBookingRoutes } from './booking.js';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const TO_EMAIL = process.env.ENQUIRY_TO || 'easytravelagency@trustagent.space';
const FROM_EMAIL = process.env.ENQUIRY_FROM || process.env.SMTP_USER || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'enquiries.db');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS enquiries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    city        TEXT,
    arrival     TEXT,
    departure   TEXT,
    guests      TEXT,
    message     TEXT NOT NULL,
    source_page TEXT,
    ip_hash     TEXT,
    user_agent  TEXT,
    mailed      INTEGER NOT NULL DEFAULT 0,
    mail_error  TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);
`);

const insertEnquiry = db.prepare(`
  INSERT INTO enquiries
    (created_at, name, email, phone, city, arrival, departure, guests,
     message, source_page, ip_hash, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const markMailed = db.prepare('UPDATE enquiries SET mailed = 1 WHERE id = ?');
const markMailError = db.prepare('UPDATE enquiries SET mail_error = ? WHERE id = ?');

// ---------------------------------------------------------------- mail
let transporter = null;
let mailConfigured = false;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  mailConfigured = true;
}

function buildMail(row) {
  const lines = [
    `New enquiry from the master website`,
    ``,
    `Name:      ${row.name}`,
    `Email:     ${row.email}`,
    `Phone:     ${row.phone || '\u2014'}`,
    `City:      ${row.city || '\u2014'}`,
    `Arrival:   ${row.arrival || '\u2014'}`,
    `Departure: ${row.departure || '\u2014'}`,
    `Guests:    ${row.guests || '\u2014'}`,
    `Page:      ${row.source_page || '\u2014'}`,
    `Received:  ${row.created_at}`,
    `Ref:       #${row.id}`,
    ``,
    `Message:`,
    row.message,
  ];
  return {
    from: FROM_EMAIL || `website@${'staymaster.local'}`,
    to: TO_EMAIL,
    replyTo: row.email,
    subject: `Website enquiry \u2014 ${row.name}${row.city ? ` (${row.city})` : ''} [#${row.id}]`,
    text: lines.join('\n'),
  };
}

// ---------------------------------------------------------------- validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX = { name: 120, email: 200, phone: 40, city: 80, date: 40, guests: 20, message: 5000 };

function clean(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
}

function validate(body) {
  const errors = {};
  const data = {
    name: clean(body.name, MAX.name),
    email: clean(body.email, MAX.email),
    phone: clean(body.phone, MAX.phone),
    city: clean(body.city, MAX.city),
    arrival: clean(body.arrival, MAX.date),
    departure: clean(body.departure, MAX.date),
    guests: clean(body.guests, MAX.guests),
    message: clean(body.message, MAX.message),
    source_page: clean(body.source_page, 300),
  };

  if (data.name.length < 2) errors.name = 'Please tell us your name.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (data.message.length < 10) errors.message = 'Please add a little more detail (at least 10 characters).';
  if (data.arrival && data.departure && data.departure < data.arrival) {
    errors.departure = 'Departure cannot be before arrival.';
  }
  return { data, errors };
}

// ---------------------------------------------------------------- rate limit
// Simple in-memory sliding window: 5 submissions per IP per 15 minutes.
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = Number(process.env.RATE_LIMIT || 5);
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
  }
  return arr.length > LIMIT;
}

function ipHash(ip) {
  return crypto.createHash('sha256')
    .update(String(ip) + (process.env.IP_SALT || 'master-site'))
    .digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------- app
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Cross-origin access is opt-in. An empty allow-list must not reflect every
  // origin while also allowing credentialed guest-session cookies.
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    // Admin actions use PATCH and Bearer authentication; browsers preflight
    // these requests before sending them.
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return res.status(403).json({ ok: false, error: 'Origin not allowed.' });
    }
    return res.sendStatus(204);
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mailConfigured, uptime: Math.round(process.uptime()) });
});

app.post('/api/enquiries', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Honeypot: real users never fill a hidden field. Pretend success so bots
  // do not learn they were caught, but store nothing.
  if (req.body && String(req.body.website || '').trim() !== '') {
    return res.status(201).json({ ok: true, id: null });
  }

  if (rateLimited(ip)) {
    return res.status(429).json({
      ok: false,
      error: 'Too many enquiries from this connection. Please try again later, or email us directly.',
    });
  }

  const { data, errors } = validate(req.body || {});
  if (Object.keys(errors).length) {
    return res.status(422).json({ ok: false, error: 'Please check the highlighted fields.', fields: errors });
  }

  const createdAt = new Date().toISOString();
  let id;
  try {
    const info = insertEnquiry.run(
      createdAt, data.name, data.email, data.phone, data.city,
      data.arrival, data.departure, data.guests, data.message,
      data.source_page, ipHash(ip), String(req.headers['user-agent'] || '').slice(0, 300),
    );
    id = info.lastInsertRowid;
  } catch (err) {
    console.error('DB insert failed:', err);
    return res.status(500).json({
      ok: false,
      error: 'We could not save your enquiry. Please email us directly at ' + TO_EMAIL,
    });
  }

  const row = { ...data, id, created_at: createdAt };

  if (!mailConfigured) {
    // Stored, but no mail transport: say so honestly rather than claiming a send.
    console.warn('SMTP not configured \u2014 enquiry stored only, id', id);
    return res.status(201).json({
      ok: true, id, mailed: false,
      message: 'Your enquiry was received and saved. Email delivery is not configured on this server yet.',
    });
  }

  try {
    await transporter.sendMail(buildMail(row));
    markMailed.run(id);
    return res.status(201).json({ ok: true, id, mailed: true });
  } catch (err) {
    console.error('Mail send failed for enquiry', id, err.message);
    markMailError.run(String(err.message).slice(0, 500));
    // The enquiry IS stored, so the guest's effort is not lost.
    return res.status(201).json({
      ok: true, id, mailed: false,
      message: 'Your enquiry was received and saved, but our email notification failed. We will still see it.',
    });
  }
});

app.get('/api/enquiries', (req, res) => {
  if (!ADMIN_TOKEN) return res.status(404).json({ ok: false, error: 'Not found' });
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const expectedToken = Buffer.from(ADMIN_TOKEN);
  const givenToken = Buffer.from(given);
  if (givenToken.length !== expectedToken.length ||
      !crypto.timingSafeEqual(givenToken, expectedToken)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 50;
  const rows = db.prepare(
    'SELECT id, created_at, name, email, phone, city, arrival, departure, guests, message, source_page, mailed, mail_error FROM enquiries ORDER BY id DESC LIMIT ?',
  ).all(limit);
  res.json({ ok: true, count: rows.length, enquiries: rows });
});

async function notifyBookingRequest(details) {
  if (!mailConfigured) return false;
  const message = [
    'A new booking request was submitted on the master website.', '',
    'Reference: ' + details.reference,
    'Guest: ' + details.guestName + ' (' + details.guestEmail + ')',
    'Property: ' + details.propertyName,
    'Apartment: ' + details.unitName,
    'Dates: ' + details.checkIn + ' to ' + details.checkOut,
    'Guests: ' + details.guests,
    details.onRequest
      ? 'Rate: on request \u2014 quote this guest before confirming.'
      : 'Total: ' + (details.totalMinor / 100).toFixed(2) + ' ' + details.currency,
    'Payment: not collected; awaiting team confirmation.'
  ].join('\n');
  await transporter.sendMail({
    from: FROM_EMAIL || 'website@staymaster.local',
    to: TO_EMAIL,
    replyTo: details.guestEmail,
    subject: 'New booking request ' + details.reference,
    text: message,
  });
  await transporter.sendMail({
    from: FROM_EMAIL || 'website@example.com',
    to: details.guestEmail,
    subject: 'We received your booking request ' + details.reference,
    text: 'Hello ' + details.guestName + ',\n\nWe received your booking request for ' + details.propertyName + ' from ' + details.checkIn + ' to ' + details.checkOut + '. This is a request, not a confirmed reservation, and no payment has been collected. Our team will contact you after checking the details.\n\nReference: ' + details.reference,
  });
  return true;
}

mountBookingRoutes(app, db, { notifyBookingRequest });


/* Third-party translation proxy removed; the website operates without external translation APIs. */

// Serve the complete website from this same Node service. Render runs with the
// repository root as its working directory; local backend runs are supported too.
const FRONTEND_DIR = path.resolve(
  process.cwd(),
  process.env.FRONTEND_DIR || (fs.existsSync(path.join(process.cwd(), 'index.html')) ? '.' : '..'),
);
// Do not expose backend source, repository metadata, or deployment files
// through the public static website.
app.use((req, res, next) => {
  const pathname = req.path || '/';
  if (/^\/(?:backend|source-imports|\.git|\.github|node_modules)(?:\/|$)/i.test(pathname) ||
      /^\/(?:render\.yaml|README\.md|\.gitignore)$/i.test(pathname)) {
    return res.status(404).end();
  }
  next();
});

/* Enforce a local-only browser policy and sanitize all HTML pages site-wide. */
const LOCAL_ONLY_CSP = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', LOCAL_ONLY_CSP);
  if (req.method !== 'GET' || !(req.path === '/' || /\.html$/i.test(req.path))) return next();
  const requested = req.path === '/' ? '/index.html' : decodeURIComponent(req.path);
  const root = path.resolve(FRONTEND_DIR);
  const file = path.resolve(root, '.' + requested);
  if (file !== root && !file.startsWith(root + path.sep)) return res.status(400).end();
  fs.readFile(file, 'utf8', (error, html) => {
    if (error) return next();
    const tag = '<script src="/local-only.js" defer></script>';
    const output = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, tag + '\n</head>') : html + tag;
    res.type('html').send(output);
  });
});

app.use(express.static(FRONTEND_DIR, {
  index: 'index.html',
  dotfiles: 'ignore',
  fallthrough: true,
  setHeaders(res, filePath) {
    if (/\.(?:html|js|css)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.use((req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

const server = app.listen(PORT, () => {
  console.log(`stay-master API listening on :${PORT}`);
  console.log(`  db: ${DB_PATH}`);
  console.log(`  mail: ${mailConfigured ? 'configured -> ' + TO_EMAIL : 'NOT configured (enquiries stored only)'}`);
});

function shutdown() {
  server.close(() => { try { db.close(); } catch {} process.exit(0); });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, db };
