/**
 * Enquiry form backend for the master site.
 *
 * POST /api/enquiries  — accepts a contact-us form submission, validates it,
 *                        stores it in SQLite, and emails it to the agency.
 * GET  /api/health     — liveness probe for Render.
 * GET  /api/enquiries  — list stored enquiries (requires ADMIN_TOKEN).
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
    `Phone:     ${row.phone || '—'}`,
    `City:      ${row.city || '—'}`,
    `Arrival:   ${row.arrival || '—'}`,
    `Departure: ${row.departure || '—'}`,
    `Guests:    ${row.guests || '—'}`,
    `Page:      ${row.source_page || '—'}`,
    `Received:  ${row.created_at}`,
    `Ref:       #${row.id}`,
    ``,
    `Message:`,
    row.message,
  ];
  return {
    from: FROM_EMAIL || `website@${new URL(process.env.SITE_URL || 'https://example.com').hostname}`,
    to: TO_EMAIL,
    replyTo: row.email,
    subject: `Website enquiry — ${row.name}${row.city ? ` (${row.city})` : ''} [#${row.id}]`,
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
  if (origin && (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
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
    console.warn('SMTP not configured — enquiry stored only, id', id);
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
  if (given !== ADMIN_TOKEN) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const limit = Math.min(Number(req.query.limit || 50), 200);
  const rows = db.prepare(
    'SELECT id, created_at, name, email, phone, city, arrival, departure, guests, message, source_page, mailed, mail_error FROM enquiries ORDER BY id DESC LIMIT ?',
  ).all(limit);
  res.json({ ok: true, count: rows.length, enquiries: rows });
});

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
