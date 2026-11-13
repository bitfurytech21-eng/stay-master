# master — serviced apartments site

Static marketing site plus a Node backend for enquiries and the first-party booking platform.

## Render commands (important)

This repository is **not a Python web application**. The Python files are offline
content-generation scripts; they are not the production server. Do not configure
the Render web service with `pip install -r requirements.txt` or a Python
`gunicorn` start command. There is no root `requirements.txt`.

The committed `render.yaml` is the recommended setup and defines two Render
services:

| Render service | Runtime / root directory | Build command | Start command / publish path |
|---|---|---|---|
| `stay-master` (website) | Static / repository root | Leave empty (no build needed) | Publish directory: `.` |
| `stay-master-api` (enquiry API) | Node / `backend` | `npm ci` | `npm start` |

If configuring manually, create the website as a **Static Site** and the API as
a separate **Web Service** with the settings above. The API uses Node 20; its
package start script runs `node src/server.js`.

## Layout

```
.                     static site — every .html, styles.css, script.js, images/
backend/              API (Node 20, Express, SQLite, Nodemailer; enquiries + booking)
render.yaml           Render blueprint for both services
404.html              custom not-found page
build.py              generates the city / building / apartment pages
build_extra.py        generates the imported top-level, family, sub and apartment pages
make_404.py           regenerates 404.html from the site template
booking.html          guest booking search, account sign-in and booking history
booking-admin.html    private booking inventory and reservation administration
data/                 extracted content + page metadata used by the generators
```

## Regenerating the site

The HTML is committed, so Render needs no build step. To change content, edit
`data/` or the generators, then:

```bash
python3 build.py
python3 build_extra.py
python3 make_404.py
```

## The enquiry form

`contact-us.html` posts JSON to `/api/enquiries`. On Render the static service
rewrites `/api/*` to the API service, so the browser sees a same-origin request
and no CORS configuration is needed.

The API:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/enquiries` | Accept a submission, store it, email it |
| `GET` | `/api/health` | Liveness probe |
| `GET` | `/api/enquiries` | List stored submissions (needs `ADMIN_TOKEN`) |

Behaviour worth knowing:

- **A submission is stored before mail is attempted**, so an SMTP outage never
  loses a lead. The response reports `mailed: true/false` and the page only
  claims the email was sent when the server says it was.
- **If SMTP is not configured** the API still stores the enquiry and returns
  `mailed: false` with a plain message — it never pretends to have sent mail.
- **Rate limit:** 5 submissions per IP per 15 minutes (`RATE_LIMIT`).
- **Honeypot:** a hidden `website` field; filled means bot, and nothing is stored.
- **Validation** is enforced on both sides: name, valid email, message of at
  least 10 characters, and departure not before arrival.


## First-party booking platform

The booking engine is now served from this repository:

- Guest booking and account page: `/booking.html`
- Private booking administration: `/booking-admin.html` (requires the API `ADMIN_TOKEN`)
- Guest accounts use scrypt password hashing and secure, HTTP-only session cookies.
- The property catalogue is seeded from the existing Stay Master locations.
- The admin team must add actual apartment inventory and verified nightly rates before a unit can appear as bookable. The platform does not invent prices or availability.
- Booking requests are stored as **pending** and send email notifications when SMTP is configured. A request is not a confirmed reservation.
- Payment status remains unpaid until staff verify an actual payment. Manual bank transfer checkout is available when configured with MANUAL_BANK_TRANSFER_ENABLED and BANK_* variables. Guest submissions remain pending until an administrator verifies the funds.
- Admin API endpoints support adding apartment inventory, reviewing/updating reservations, and verifying or rejecting manual payment submissions.
- Configure `MANUAL_BANK_TRANSFER_ENABLED=true`, `BANK_NAME`, `BANK_ACCOUNT_NAME`, and `BANK_ACCOUNT_NUMBER`, and `BANK_ACCOUNT_CURRENCY` (three-letter ISO code, e.g. EUR) on the Render API service before exposing bank-transfer checkout. Optional fields: `BANK_SORT_CODE`, `BANK_IBAN`, `BANK_SWIFT`, `BANK_TRANSFER_INSTRUCTIONS`.
- Guests submit payer name, transfer date, and transaction reference. The API checks the declared amount against the booking total and prevents duplicate transaction references. Staff must verify funds in the receiving bank account before approval. Receipt upload and automated bank reconciliation are not included.

Core booking API routes include `/api/auth/register`, `/api/auth/login`,
`/api/auth/me`, `/api/booking/properties`, `/api/booking/availability`,
`/api/bookings`, `/api/bookings/mine`, `/api/payments/methods`, `/api/bookings/:reference/payments`, and protected
`/api/admin/booking/*` endpoints.

## Deploying to Render

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → select this repo. `render.yaml`
   creates both services with the commands listed above.
3. On the **stay-master-api** service, set the secrets marked `sync: false`:
   `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
   `ENQUIRY_FROM`, `ADMIN_TOKEN`, `ALLOWED_ORIGINS`.
   For Gmail use an App Password, not the account password.
4. Confirm the API host in `render.yaml` (`stay-master-api.onrender.com`) matches
   the name Render assigned, then redeploy the static service.
5. Check `https://<api-host>/api/health` returns JSON with `ok: true`.

The API mounts a 1 GB disk at `/var/data` so the SQLite database survives
deploys. Without a disk, submissions are lost on every deploy.

## Local development

```bash
cd backend
cp .env.example .env      # fill in SMTP details
npm install
npm start                 # http://localhost:3000
```

Serve the site separately, e.g. `python3 -m http.server 8080`, and point the
form at the API by building with `ENQUIRY_ENDPOINT=http://localhost:3000/api/enquiries`.

## Notes

- Reviews and special-offer pages carry no scraped review data: the source site
  renders them client-side, so those pages point guests at the booking platforms
  and do not invent testimonials.
- The site is static; nothing on it stores data in the browser.
