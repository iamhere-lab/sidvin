# Sidvin Celeste — Landing Page

Static replica of `sidvinceleste.com` in plain HTML, CSS and JavaScript.
No build step, no framework, no dependencies — push to GitHub, import into Vercel, done.

```
index.html                  Home page (all sections + inline form + popup)
thank-you.html              Thank-you page (form redirects here)
assets/css/styles.css       All styling (design tokens at the top)
assets/js/config.js         >>> THE ONLY FILE YOU NEED TO EDIT <<<
assets/js/lead-form.js      Validation, MSG91 OTP, Google Sheets submit, popup
assets/js/site.js           Header, nav, plan tabs, gallery lightbox, reveals
apps-script/Code.gs         Paste this into the Google Sheet's Apps Script editor
scripts/localise-assets.*   Downloads the images into assets/images (optional)
vercel.json                 Clean URLs + caching headers
```

---

## 1. Google Sheets

1. Open the spreadsheet **Sidvin Celeste New Google Ads**.
2. **Extensions → Apps Script**, delete the placeholder, paste `apps-script/Code.gs`, save.
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the `.../exec` URL.
5. Paste it into `assets/js/config.js` as `SHEET_ENDPOINT`.

The script writes to the tab named **Google sheet** with the columns
`Date | Name | Email | Phone number | Configuration`, and creates that tab
with a styled header row if it doesn't exist yet. The date is written in IST
as `dd/MM/yyyy HH:mm:ss`.

> After **any** edit to `Code.gs`, use *Manage deployments → edit → New version*.
> Editing without redeploying keeps the old code live.

---

## 2. MSG91 SMS OTP

1. MSG91 panel → **OTP** → **Create New Widget** (pick the free plan when prompted).
   Configure: name, verification type = OTP, contact point = **Mobile**, primary
   channel = **SMS**, OTP length = **6**, resend rules, and pick/create an SMS template.
2. At the end of the wizard MSG91 shows the **integration code**. The `widgetId` in
   that snippet is your **Widget ID**.
3. The **Token Auth** is an account-level auth token, not part of the widget — in the
   snippet use **Select token** from the dropdown, or create one under **Token** in the
   top-left sidebar.
4. Paste both into `assets/js/config.js`.
5. If you set any domain/origin restriction on the widget, add your `*.vercel.app` URL
   (and later the live domain) to it, or requests from the browser get rejected.

Both values are designed to be public/client-side — they are not secrets, so it is
safe to commit them. There is no server, no API key, and nothing to configure on Vercel.

### Demo mode
While those two values still say `PASTE_YOUR_...`, the site runs in **demo mode**:
the OTP box appears and behaves exactly as it will in production, and any 6-digit
code is accepted, so you can test the whole flow before the MSG91 account is ready.
Demo mode switches itself off the moment real credentials are pasted in.

---

## 3. Form behaviour

Every form on the site (hero, contact section, popup) is the same component.

- All four fields are mandatory, with inline validation:
  name (letters, min 2), email (format), mobile (Indian 10-digit starting 6–9),
  configuration (must be chosen).
- Pressing **Submit Now** validates first, then sends the OTP and reveals the OTP panel.
- Entering the 6th OTP digit auto-verifies. On success the lead is posted to
  Google Sheets and the browser goes to `thank-you.html`.
- Changing the mobile number after verification clears the verification.
- Resend is rate-limited by a 30-second countdown (`OTP_RESEND_SECONDS`).

### Popup
- Auto-opens **8 seconds** after the home page loads (`POPUP_DELAY_MS`).
- Once per browser session by default — set `POPUP_ONCE_PER_SESSION: false`
  to have it open on every page load.
- Every CTA on the page opens it. To make any new element a trigger, just add
  `data-enquiry="some-label"` to it — the label is passed through to the sheet
  in the `source` field so you can see which CTA produced the lead.

---

## 4. Images

The HTML ships pointing at the images on `sidvinceleste.com`, so the site works the
moment it is deployed. To bundle them into the repo instead:

```powershell
# Windows — from the project root
powershell -ExecutionPolicy Bypass -File scripts\localise-assets.ps1
```
```bash
# macOS / Linux
bash scripts/localise-assets.sh
```

It downloads **34 files** into `assets/images/` and rewrites both HTML files.
Safe to re-run — files already present are skipped, and a failed download is left
pointing at the live site rather than breaking.

Two deliberate choices in how images are referenced:

- **Display size.** Pages use the 1024px renders WordPress already generated, not
  the 2560px originals. The hero uses the 2048px render because it is the LCP image
  and spans the viewport. This is what the live site does too, and it matters for
  Google Ads Quality Score.
- **`data-full`.** Only the seven floor plans carry a `data-full` attribute pointing
  at the full-resolution original, because those are the images people zoom into to
  read dimensions. The lightbox is capped at 1100px wide, so for gallery shots the
  1024px render already is full quality — shipping the originals as well would have
  roughly doubled the download for no visible gain.

`og:image` is intentionally **not** localised. Link previews on WhatsApp, Facebook
and LinkedIn require an absolute URL, so that one tag keeps pointing at the live
site. Once you have your own domain, update it by hand to
`https://yourdomain.com/assets/images/...`.

---

## 5. Deploy

```bash
git init
git add .
git commit -m "Sidvin Celeste landing page"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

In Vercel: **Add New → Project → import the repo**.
Framework preset **Other**, build command empty, output directory empty — it is a
static site. `vercel.json` turns on clean URLs, so the thank-you page lives at
`/thank-you`.

---

## 6. Things left to point at real values

| Where | What |
|---|---|
| `assets/js/config.js` | `SHEET_ENDPOINT`, `MSG91_WIDGET_ID`, `MSG91_TOKEN_AUTH` |
| `assets/js/config.js` | `WHATSAPP_NUMBER`, `PHONE_NUMBER` — currently sample numbers |
| `index.html` footer | Facebook / YouTube / Instagram `href="#"` |
| `index.html` | GTM / Google Ads / Meta Pixel tags are **not** included — add your own |

> ⚠️ **When applying an updated build, keep your own `assets/js/config.js`.**
> Every other file can be overwritten safely; that one holds your Apps Script URL
> and MSG91 credentials.

---

## 7. Palette & typography

These are the real values, read out of the live site's Elementor stylesheet
(`post-6.css`), not approximations. All of them live as tokens at the top of
`assets/css/styles.css`.

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#080A0F` | deepest section base |
| `--bg-alt` | `#0F0F0F` | alternating sections, hero base |
| `--navy` / `--navy-2` | `#0B172D` / `#0C1930` | gradient stops |
| `--field-bg` | `#0D1C34` | form field fill |
| `--gold` | `#D4AF37` | headings, buttons, accents |
| `--accent` | `#AA3186` | uppercase section labels |
| `--text` | `#DDD7D7` | body copy |
| `--text-muted` | `#AFABAB` | secondary copy |
| `--text-dim` | `#878383` | small labels |
| `--text-warm` | `#CBC8C0` | italic pull quotes |

Gradients are copied verbatim from the live CSS:

```
--grad-hero: linear-gradient(0deg, #0C1930 5%, #000000 42%)
--grad-down: linear-gradient(180deg, #0B172D 23%, #000000 100%)
--grad-up:   linear-gradient(180deg, #080A0F 0%, #0B172D 100%)
```

Fonts: **Cormorant Garamond** 600 for display headings (48px on the live site),
**Inter Tight** for body and small caps labels, **Playfair Display** for card titles.

### Conversion tracking
`lead-form.js` fires a `gtag('event', 'generate_lead', …)` on successful submit if
`gtag` exists on the page, so adding the Google Ads tag in `<head>` is enough to
start recording conversions. Alternatively track a pageview of `/thank-you` as the
conversion — every successful submit lands there.
