import crypto from 'node:crypto';

const COOKIE = 'stay_master_session';
const SESSION_DAYS = 14;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function tokenHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf('=');
    return i < 0 ? [v, ''] : [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
  }));
}
function dateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}
function nightsBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function safeUser(row) {
  return row ? { id: row.id, name: row.name, email: row.email, createdAt: row.created_at } : null;
}
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: key };
}
function verifyPassword(password, salt, expected) {
  const actual = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(expected, 'hex');
  return actual.length === stored.length && crypto.timingSafeEqual(actual, stored);
}

export function mountBookingRoutes(app, db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS guest_sessions (
      token_hash TEXT PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS booking_properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS booking_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES booking_properties(id),
      name TEXT NOT NULL,
      max_guests INTEGER NOT NULL DEFAULT 2,
      nightly_rate_minor INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      property_id INTEGER NOT NULL REFERENCES booking_properties(id),
      unit_id INTEGER NOT NULL REFERENCES booking_units(id),
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      guests INTEGER NOT NULL,
      nights INTEGER NOT NULL,
      currency TEXT NOT NULL,
      total_minor INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      special_requests TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_booking_dates ON bookings(unit_id, check_in, check_out, status);
    CREATE INDEX IF NOT EXISTS idx_guest_bookings ON bookings(guest_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_booking_city ON booking_properties(city, active);
  `);

  const guestById = db.prepare('SELECT id,name,email,created_at FROM guests WHERE id=?');
  function currentGuest(req) {
    const raw = parseCookies(req.headers.cookie)[COOKIE];
    if (!raw) return null;
    const session = db.prepare('SELECT guest_id,expires_at FROM guest_sessions WHERE token_hash=?').get(tokenHash(raw));
    if (!session || session.expires_at <= new Date().toISOString()) return null;
    return guestById.get(session.guest_id) || null;
  }
  function requireGuest(req, res, next) {
    const guest = currentGuest(req);
    if (!guest) return res.status(401).json({ ok: false, error: 'Please sign in to continue.' });
    req.guest = guest;
    next();
  }
  function requireAdmin(req, res, next) {
    const expected = process.env.ADMIN_TOKEN || '';
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ ok: false, error: 'Administrator authentication required.' });
    }
    next();
  }
  function issueSession(res, guestId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
    db.prepare('INSERT INTO guest_sessions(token_hash,guest_id,expires_at,created_at) VALUES(?,?,?,?)')
      .run(tokenHash(token), guestId, expires.toISOString(), now.toISOString());
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  }

  app.post('/api/auth/register', (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 120);
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200);
    const password = String(req.body?.password || '');
    if (name.length < 2 || !emailRe.test(email) || password.length < 10 || password.length > 200) {
      return res.status(422).json({ ok: false, error: 'Enter your name, a valid email and a password of at least 10 characters.' });
    }
    const credentials = passwordHash(password);
    try {
      const result = db.prepare('INSERT INTO guests(name,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)')
        .run(name, email, credentials.salt, credentials.hash, new Date().toISOString());
      issueSession(res, Number(result.lastInsertRowid));
      return res.status(201).json({ ok: true, user: safeUser(guestById.get(Number(result.lastInsertRowid))) });
    } catch (error) {
      if (String(error.code || '').includes('CONSTRAINT')) return res.status(409).json({ ok: false, error: 'An account with this email already exists.' });
      console.error('Guest registration failed:', error);
      return res.status(500).json({ ok: false, error: 'We could not create your account. Please try again.' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const row = db.prepare('SELECT * FROM guests WHERE email=?').get(email);
    if (!row || !verifyPassword(password, row.password_salt, row.password_hash)) {
      return res.status(401).json({ ok: false, error: 'Email or password is incorrect.' });
    }
    issueSession(res, row.id);
    return res.json({ ok: true, user: safeUser(row) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const raw = parseCookies(req.headers.cookie)[COOKIE];
    if (raw) db.prepare('DELETE FROM guest_sessions WHERE token_hash=?').run(tokenHash(raw));
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => res.json({ ok: true, user: safeUser(currentGuest(req)) }));

  app.get('/api/booking/properties', (req, res) => {
    const city = String(req.query.city || '').trim();
    const rows = db.prepare(`
      SELECT p.id,p.slug,p.name,p.city,p.country,p.address,p.description,p.image,
        COUNT(u.id) AS unit_types, MIN(u.nightly_rate_minor) AS from_rate,
        MIN(u.currency) AS currency
      FROM booking_properties p LEFT JOIN booking_units u ON u.property_id=p.id AND u.active=1
      WHERE p.active=1 AND (?='' OR lower(p.city)=lower(?))
      GROUP BY p.id ORDER BY p.city,p.name
    `).all(city, city);
    res.json({ ok: true, properties: rows });
  });

  app.get('/api/booking/availability', (req, res) => {
    const propertyId = Number(req.query.propertyId);
    const checkIn = dateOnly(req.query.checkIn);
    const checkOut = dateOnly(req.query.checkOut);
    const guests = Math.max(1, Math.min(12, Number(req.query.guests) || 1));
    if (!Number.isInteger(propertyId) || !checkIn || !checkOut || nightsBetween(checkIn, checkOut) < 1 || nightsBetween(checkIn, checkOut) > 90) {
      return res.status(422).json({ ok: false, error: 'Choose valid dates (1–90 nights).' });
    }
    const units = db.prepare(`
      SELECT u.id,u.name,u.max_guests,u.nightly_rate_minor,u.currency
      FROM booking_units u JOIN booking_properties p ON p.id=u.property_id
      WHERE u.property_id=? AND u.active=1 AND p.active=1 AND u.max_guests>=?
      AND NOT EXISTS (
        SELECT 1 FROM bookings b WHERE b.unit_id=u.id
        AND b.status IN ('pending','confirmed')
        AND b.check_in < ? AND b.check_out > ?
      )
      ORDER BY u.nightly_rate_minor ASC
    `).all(propertyId, guests, req.query.checkOut, req.query.checkIn);
    res.json({ ok: true, checkIn: req.query.checkIn, checkOut: req.query.checkOut, nights: nightsBetween(checkIn, checkOut), units });
  });

  app.post('/api/bookings', requireGuest, (req, res) => {
    const unitId = Number(req.body?.unitId);
    const propertyId = Number(req.body?.propertyId);
    const checkIn = dateOnly(req.body?.checkIn);
    const checkOut = dateOnly(req.body?.checkOut);
    const guests = Math.max(1, Math.min(12, Number(req.body?.guests) || 1));
    const requests = String(req.body?.specialRequests || '').trim().slice(0, 1500);
    if (!Number.isInteger(unitId) || !Number.isInteger(propertyId) || !checkIn || !checkOut) {
      return res.status(422).json({ ok: false, error: 'Please select a property, apartment and valid dates.' });
    }
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1 || nights > 90) return res.status(422).json({ ok: false, error: 'Bookings must be between 1 and 90 nights.' });
    const unit = db.prepare(`
      SELECT u.*,p.id AS property_id,p.name AS property_name FROM booking_units u
      JOIN booking_properties p ON p.id=u.property_id
      WHERE u.id=? AND p.id=? AND u.active=1 AND p.active=1 AND u.max_guests>=?
    `).get(unitId, propertyId, guests);
    if (!unit) return res.status(404).json({ ok: false, error: 'This apartment is no longer available.' });
    const conflict = db.prepare(`
      SELECT id FROM bookings WHERE unit_id=? AND status IN ('pending','confirmed')
      AND check_in < ? AND check_out > ? LIMIT 1
    `).get(unitId, req.body.checkOut, req.body.checkIn);
    if (conflict) return res.status(409).json({ ok: false, error: 'Those dates have just become unavailable. Please search again.' });
    const total = unit.nightly_rate_minor * nights;
    const now = new Date().toISOString();
    const reference = 'SM-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const insert = db.prepare(`
      INSERT INTO bookings(reference,guest_id,property_id,unit_id,check_in,check_out,guests,nights,currency,total_minor,status,payment_status,special_requests,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,'pending','unpaid',?,?,?)
    `);
    insert.run(reference, req.guest.id, propertyId, unitId, req.body.checkIn, req.body.checkOut, guests, nights, unit.currency, total, requests, now, now);
    return res.status(201).json({ ok: true, reference, status: 'pending', paymentStatus: 'unpaid', totalMinor: total, currency: unit.currency, message: 'Your booking request has been recorded. Payment is not yet collected; the team will confirm availability and payment instructions.' });
  });

  app.get('/api/bookings/mine', requireGuest, (req, res) => {
    const bookings = db.prepare(`
      SELECT b.reference,b.check_in,b.check_out,b.guests,b.nights,b.currency,b.total_minor,b.status,b.payment_status,b.created_at,
        p.name AS property_name,p.city,u.name AS unit_name
      FROM bookings b JOIN booking_properties p ON p.id=b.property_id
      JOIN booking_units u ON u.id=b.unit_id WHERE b.guest_id=? ORDER BY b.created_at DESC
    `).all(req.guest.id);
    res.json({ ok: true, bookings });
  });

  app.get('/api/admin/booking/properties', requireAdmin, (req, res) => {
    res.json({ ok: true, properties: db.prepare('SELECT * FROM booking_properties ORDER BY city,name').all() });
  });
  app.post('/api/admin/booking/properties', requireAdmin, (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 160);
    const city = String(req.body?.city || '').trim().slice(0, 100);
    const country = String(req.body?.country || '').trim().slice(0, 100);
    const slug = String(req.body?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
    if (!name || !city || !country || !slug) return res.status(422).json({ ok: false, error: 'Name, slug, city and country are required.' });
    try {
      const result = db.prepare('INSERT INTO booking_properties(slug,name,city,country,address,description,image,created_at) VALUES(?,?,?,?,?,?,?,?)')
        .run(slug,name,city,country,String(req.body.address||'').slice(0,300),String(req.body.description||'').slice(0,2000),String(req.body.image||'').slice(0,500),new Date().toISOString());
      res.status(201).json({ ok: true, id: Number(result.lastInsertRowid) });
    } catch { res.status(409).json({ ok: false, error: 'That property slug already exists.' }); }
  });
  app.post('/api/admin/booking/units', requireAdmin, (req, res) => {
    const propertyId = Number(req.body?.propertyId);
    const name = String(req.body?.name || '').trim().slice(0,160);
    const maxGuests = Math.max(1, Math.min(12, Number(req.body?.maxGuests)||2));
    const rate = Number(req.body?.nightlyRateMinor);
    const currency = String(req.body?.currency || 'EUR').toUpperCase();
    if (!Number.isInteger(propertyId) || !name || !Number.isSafeInteger(rate) || rate < 1 || !/^[A-Z]{3}$/.test(currency)) {
      return res.status(422).json({ ok: false, error: 'Provide a valid property, unit name, nightly rate in minor currency units and ISO currency code.' });
    }
    const result = db.prepare('INSERT INTO booking_units(property_id,name,max_guests,nightly_rate_minor,currency,created_at) VALUES(?,?,?,?,?,?)')
      .run(propertyId,name,maxGuests,rate,currency,new Date().toISOString());
    res.status(201).json({ ok: true, id: Number(result.lastInsertRowid) });
  });
  app.get('/api/admin/booking/reservations', requireAdmin, (req, res) => {
    const rows = db.prepare(`
      SELECT b.*,g.name AS guest_name,g.email AS guest_email,p.name AS property_name,u.name AS unit_name
      FROM bookings b JOIN guests g ON g.id=b.guest_id
      JOIN booking_properties p ON p.id=b.property_id JOIN booking_units u ON u.id=b.unit_id
      ORDER BY b.created_at DESC LIMIT 250
    `).all();
    res.json({ ok: true, bookings: rows });
  });
  app.patch('/api/admin/booking/reservations/:reference', requireAdmin, (req, res) => {
    const status = String(req.body?.status || '');
    const paymentStatus = String(req.body?.paymentStatus || '');
    if (status && !['pending','confirmed','cancelled','completed'].includes(status)) return res.status(422).json({ ok:false,error:'Invalid booking status.' });
    if (paymentStatus && !['unpaid','pending','paid','refunded','failed'].includes(paymentStatus)) return res.status(422).json({ ok:false,error:'Invalid payment status.' });
    const row = db.prepare('SELECT id FROM bookings WHERE reference=?').get(req.params.reference);
    if (!row) return res.status(404).json({ ok:false,error:'Booking not found.' });
    db.prepare('UPDATE bookings SET status=COALESCE(?,status),payment_status=COALESCE(?,payment_status),updated_at=? WHERE id=?')
      .run(status || null,paymentStatus || null,new Date().toISOString(),row.id);
    res.json({ ok:true });
  });
}
