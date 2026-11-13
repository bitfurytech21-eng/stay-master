import express from 'express';
import { db } from './db.js';
import { requireUser } from './auth.js';
import { sendMail } from './mailer.js';

export const bookingRouter = express.Router();

const DAY = 86400000;

function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function nightsBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

function reference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'SM-';
  for (let i = 0; i < 8; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

bookingRouter.get('/properties', (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const rows = city
    ? db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM booking_units u WHERE u.property_id=p.id) AS unit_types
        FROM booking_properties p WHERE lower(p.city)=lower(?) ORDER BY p.name`).all(city)
    : db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM booking_units u WHERE u.property_id=p.id) AS unit_types
        FROM booking_properties p ORDER BY p.city, p.name`).all();
  res.json({ ok: true, properties: rows });
});

bookingRouter.get('/availability', (req, res) => {
  const propertyId = Number(req.query.propertyId);
  const checkIn = isoDate(req.query.checkIn);
  const checkOut = isoDate(req.query.checkOut);
  const guests = Number(req.query.guests || 1);

  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    return res.status(400).json({ ok: false, error: 'A valid property is required.' });
  }
  if (!checkIn || !checkOut) {
    return res.status(400).json({ ok: false, error: 'Check-in and check-out dates are required.' });
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    return res.status(400).json({ ok: false, error: 'Check-out must be after check-in.' });
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    return res.status(400).json({ ok: false, error: 'Guests must be between 1 and 12.' });
  }

  const units = db.prepare(`SELECT u.* FROM booking_units u
    WHERE u.property_id=? AND u.max_guests>=?
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.unit_id=u.id AND b.status IN ('pending','confirmed')
          AND b.check_in < ? AND b.check_out > ?
      )
    ORDER BY u.nightly_rate_minor, u.name`).all(propertyId, guests, req.query.checkOut, req.query.checkIn);

  res.json({ ok: true, nights, units });
});

bookingRouter.post('/', requireUser, async (req, res) => {
  const body = req.body || {};
  const unitId = Number(body.unitId);
  const propertyId = Number(body.propertyId);
  const checkIn = isoDate(body.checkIn);
  const checkOut = isoDate(body.checkOut);
  const guests = Number(body.guests || 1);

  if (!Number.isInteger(unitId) || !Number.isInteger(propertyId)) {
    return res.status(400).json({ ok: false, error: 'A valid apartment is required.' });
  }
  if (!checkIn || !checkOut) {
    return res.status(400).json({ ok: false, error: 'Check-in and check-out dates are required.' });
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    return res.status(400).json({ ok: false, error: 'Check-out must be after check-in.' });
  }
  if (checkIn.getTime() < new Date(new Date().toDateString()).getTime()) {
    return res.status(400).json({ ok: false, error: 'Check-in must be today or a future date.' });
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    return res.status(400).json({ ok: false, error: 'Guests must be between 1 and 12.' });
  }

  const unit = db.prepare('SELECT * FROM booking_units WHERE id=? AND property_id=?').get(unitId, propertyId);
  if (!unit) return res.status(404).json({ ok: false, error: 'That apartment is not available.' });
  if (guests > unit.max_guests) {
    return res.status(400).json({ ok: false, error: 'That apartment sleeps up to ' + unit.max_guests + ' guests.' });
  }

  const clash = db.prepare(`SELECT 1 FROM bookings
    WHERE unit_id=? AND status IN ('pending','confirmed') AND check_in < ? AND check_out > ?`)
    .get(unitId, body.checkOut, body.checkIn);
  if (clash) return res.status(409).json({ ok: false, error: 'That apartment is already requested for those dates.' });

  const property = db.prepare('SELECT * FROM booking_properties WHERE id=?').get(propertyId);
  const total = unit.nightly_rate_minor * nights;
  // A 0 nightly rate means the apartment is priced on request: the request is
  // still recorded, but no amount is quoted and no payment is expected yet.
  const onRequest = unit.nightly_rate_minor === 0;
  const ref = reference();
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO bookings
    (reference,user_id,property_id,unit_id,check_in,check_out,guests,nights,total_minor,currency,status,payment_status,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,'pending','unpaid',?)`).run(
    ref, req.user.id, propertyId, unitId, body.checkIn, body.checkOut, guests, nights, total, unit.currency, now);

  const details = {
    reference: ref,
    guestName: req.user.name,
    guestEmail: req.user.email,
    propertyName: property ? property.name : 'master',
    unitName: unit.name,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    nights,
    guests,
    total,
    currency: unit.currency,
    onRequest
  };

  // Notify the team. A mail failure must never lose the booking request.
  try {
    await sendMail({
      to: process.env.BOOKING_NOTIFY_EMAIL || process.env.SMTP_USER,
      subject: 'New booking request ' + ref + (onRequest ? ' (rate on request)' : ''),
      text: [
        'New booking request ' + ref,
        '',
        'Guest: ' + details.guestName + ' <' + details.guestEmail + '>',
        'Property: ' + details.propertyName,
        'Apartment: ' + details.unitName,
        'Dates: ' + details.checkIn + ' to ' + details.checkOut + ' (' + nights + ' nights)',
        'Guests: ' + guests,
        onRequest ? 'Rate: on request - quote this guest before confirming.' : 'Total: ' + (total / 100).toFixed(2) + ' ' + unit.currency,
        'Payment: not collected; awaiting team confirmation.'
      ].join('\n')
    });
  } catch (err) {
    console.error('booking notification failed', err.message);
  }

  try {
    await sendMail({
      to: details.guestEmail,
      subject: 'We received your booking request ' + ref,
      text: 'Hello ' + details.guestName + ',\n\nWe received your booking request for ' + details.propertyName + ' from ' + details.checkIn + ' to ' + details.checkOut + '. This is a request, not a confirmed reservation, and no payment has been collected. Our team will contact you after checking the details.\n\nReference: ' + details.reference
    });
  } catch (err) {
    console.error('guest confirmation failed', err.message);
  }

  return res.status(201).json({ ok: true, reference: ref, status: 'pending', paymentStatus: 'unpaid', totalMinor: total, currency: unit.currency, onRequest });
});

bookingRouter.get('/mine', requireUser, (req, res) => {
  const rows = db.prepare(`SELECT b.*, p.name AS property_name, p.city, u.name AS unit_name,
      (SELECT status FROM payment_submissions s WHERE s.booking_id=b.id ORDER BY s.id DESC LIMIT 1) AS latest_payment_submission
    FROM bookings b
    JOIN booking_properties p ON p.id=b.property_id
    JOIN booking_units u ON u.id=b.unit_id
    WHERE b.user_id=? ORDER BY b.id DESC`).all(req.user.id);
  res.json({ ok: true, bookings: rows });
});
