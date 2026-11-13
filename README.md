# master — serviced apartments site

Static marketing site (202 pages) plus a small Node backend for the enquiry form.

## Layout

```
.                     static site — every .html, styles.css, script.js, images/
backend/              enquiry API (Node 20, Express, SQLite, Nodemailer)
render.yaml           Render blueprint for both services
404.html              custom not-found page
build.py              generates the city / building / apartment pages
build_extra.py        generates the imported top-level, family, sub and apartment pages
make_404.py           regenerates 404.html from the site template
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

## Deploying to Render

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → select the repo. `render.yaml`
   creates both services.
3. On the **stay-master-api** service, set the secrets marked `sync: false`:
   `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
   `ENQUIRY_FROM`, `ADMIN_TOKEN`, `ALLOWED_ORIGINS`.
   For Gmail use an App Password, not the account password.
4. Confirm the API host in `render.yaml` (`stay-master-api.onrender.com`) matches
   the name Render assigned, then redeploy the static service.
5. Check `https://<api-host>/api/health` returns `{"ok":true,"mailConfigured":true}`.

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
  rather than inventing testimonials.
- The site is static; nothing on it stores data in the browser.
