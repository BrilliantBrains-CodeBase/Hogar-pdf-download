# Hogar / DU – QR Lead Capture Form

A single, mobile-first lead capture page for Hogar Controls events. Visitors scan **one QR code**, fill in **one form**, and choose **Hogar** or **DU**. After Google Sheets confirms the lead is saved, they **automatically get that company's catalogue PDF** and land on a branded **Thank You** page that has a fallback **Download Catalogue** button.

```
QR scan → Form (/) → choose Hogar or DU → Submit
       → Apps Script saves the row in Google Sheets → { success: true, leadId }
       → catalogue download starts (Hogar-Catalogue.pdf / DU-Catalogue.pdf)
       → /thank-you (fallback Download Catalogue button + Visit Hogar Controls)
```

**Stack:** React 18 + Vite 5 (JavaScript, custom CSS, lucide-react icons, react-router) · Google Apps Script Web App · Google Sheets. No paid services.

---

## 1. Project structure

```
├── google-apps-script/
│   └── Code.gs                  # Backend: validation, sanitisation, Sheets write, Lead ID
├── public/
│   ├── brand/                   # Official Hogar logos + favicon (from hogarcontrols.com)
│   ├── catalogues/
│   │   ├── hogar-catalogue.pdf  # Hogar catalogue (replace to update)
│   │   └── du-catalogue.pdf     # DU catalogue (replace to update)
│   ├── _redirects               # Netlify SPA fallback (/thank-you on refresh)
│   └── .htaccess                # Apache/cPanel SPA fallback
├── src/
│   ├── components/
│   │   ├── LeadCaptureForm.jsx  # The form: fields, validation, submit, retry
│   │   ├── SuccessMessage.jsx   # Success state used on the Thank You page
│   │   ├── Header.jsx / Footer.jsx
│   ├── config/
│   │   ├── catalogues.js        # Company → catalogue PDF mapping
│   │   ├── brand.js             # Logos, company details, links
│   │   └── formOptions.js       # Category & company dropdown options
│   ├── pages/
│   │   ├── FormPage.jsx         # Route "/"
│   │   └── ThankYouPage.jsx     # Route "/thank-you"
│   ├── services/googleAppsScript.js  # POST to Apps Script; resolves only on confirmed save
│   ├── utils/                   # validation, download helpers, submission session
│   ├── App.jsx · main.jsx · index.css
├── .env.example
├── vercel.json                  # Vercel SPA fallback
└── README.md
```

---

## 2. Run locally

Requires Node.js 18+.

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# put your Apps Script /exec URL in .env (see section 3)
npm run dev               # http://localhost:5173
```

`npm run build` writes the production site to `dist/`. Use `npm run preview` to test that build locally.

> If `VITE_GOOGLE_SCRIPT_URL` is missing, the form shows a "not connected" error. It never shows a fake success.

---

## 3. Google Sheets & Apps Script setup

### 3.1 Create the Sheet
1. Create a new Google Sheet, for example **"Hogar Event Leads"**.
2. Copy its **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`1AbC...xyz`**`/edit`

### 3.2 Add the script
You can do this in either of two ways:

- **Option A (recommended): bound script.** In the Sheet, go to **Extensions → Apps Script**. You can leave `CONFIG.SHEET_ID` empty (`''`).
- **Option B: standalone script.** Go to [script.google.com](https://script.google.com) → **New project**, then set `CONFIG.SHEET_ID` to the ID you copied.

Then:
1. Delete the default code and paste in all of [google-apps-script/Code.gs](google-apps-script/Code.gs).
2. Optionally change `SHEET_NAME` (default `Leads`) or `TIMEZONE` (default `Asia/Kolkata`).
3. Click **Save**.
4. Choose the **`setup`** function and click **Run**. Approve the permission prompt. If you see "Google hasn't verified this app", click **Advanced → Go to project (unsafe)**. This is your own script.

   This creates the **Leads** tab with these headers:
   `Lead ID | Timestamp | Category | Company Selection | Full Name | Firm / Company Name | Mobile Number | Email | City | Remarks`
5. Optional: run **`testSubmission`**. A test row appears in the sheet. Delete it afterwards.

### 3.3 Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Click the gear icon → **Web app**.
3. Fill in:
   - **Description:** Lead capture v1
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
4. Click **Deploy**, then copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.
5. Open that URL in a browser. You should see `{"success":true,"status":"ok",...}`.
6. Put the URL in `.env` (or your host's environment variables):
   ```
   VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfy.../exec
   ```
7. Rebuild and redeploy the frontend. Vite bakes env values in at build time.

> **Updating the script later:** go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. This keeps the same URL. If you use **New deployment** instead, you get a new URL and must update `.env`.

### What the backend does
- Validates every field again on the server: allowed category and company, name, a 10-digit Indian mobile starting with 6–9, email format, and length limits.
- Removes control characters, trims and collapses whitespace.
- Blocks **formula injection**. Values that start with `= + - @` get a `'` prefix, so Sheets stores them as text.
- Creates a **unique Lead ID**, e.g. `LEAD-20261118-7F3A9C`, and records a timestamp.
- Uses `LockService` so simultaneous submissions don't collide.
- **Prevents duplicates.** Each form attempt sends a `submissionId`. If the same ID arrives again (for example, a retry after the network dropped the reply), the original Lead ID is returned and no second row is written.
- Has a honeypot field that quietly drops bot submissions.
- Always returns JSON: `{ success: true, leadId }` or `{ success: false, message }`.

---

## 4. Catalogue PDFs

The mapping is in [src/config/catalogues.js](src/config/catalogues.js):

```js
export const CATALOGUES = {
  Hogar: { label: 'Hogar Product Catalogue', url: env || '/catalogues/hogar-catalogue.pdf', fileName: 'Hogar-Catalogue.pdf' },
  DU:    { label: 'DU Product Catalogue',    url: env || '/catalogues/du-catalogue.pdf',    fileName: 'DU-Catalogue.pdf' },
};
```

The two PDFs you supplied are already in `public/catalogues/`.

### Replacing a catalogue: pick one way
1. **Easiest (recommended):** overwrite `public/catalogues/hogar-catalogue.pdf` or `du-catalogue.pdf` with the new file, keeping the same name. Then rebuild and redeploy.
2. **External URL:** set `VITE_HOGAR_CATALOGUE_URL` / `VITE_DU_CATALOGUE_URL` in `.env`, then rebuild.
3. Edit the fallback URL in `catalogues.js` directly.

### How the download works (and its limits)
- **Same-origin files** (the default `/catalogues/...`) use `<a download="Hogar-Catalogue.pdf">`. This is the most reliable option on Android Chrome, iOS Safari and desktop, and it saves with the right filename. **Keep the PDFs on the same domain whenever you can.**
- **External URLs** (another domain): browsers ignore the `download` attribute for cross-origin files. The app then opens the PDF in a new tab instead, and the device's own viewer lets the visitor save it.
  - Google Drive `.../file/d/<id>/view` links are converted to `uc?export=download&id=<id>` automatically. Set the Drive file to "Anyone with the link".
  - Dropbox links are switched to `?dl=1` automatically.
- **iOS Safari** usually opens the PDF in its viewer instead of saving it straight away. Visitors can save it from there with Share → Save to Files. This is how iOS works.
- **Download timing:** the download starts only after Apps Script returns `success: true`. It runs once, inside the submit handler, and never on page render. The Thank You page never downloads automatically. Its **Download Catalogue** button is a real link to the same file, so it still works if the automatic download was blocked.

---

## 5. Thank You page (`/thank-you`)

- It is reached only through a confirmed submission. The form saves `{ leadId, company, submittedAt }` in `sessionStorage` (current tab only, valid for 30 minutes) and passes it in the router state.
- **Refresh:** the page shows again from `sessionStorage`. It does not resubmit or download again.
- **Direct visit, new tab or expired session:** the visitor is redirected to the form, so a false success message never appears.
- It shows only the catalogue the visitor selected.

Your web host must send unknown paths to `index.html` so that `/thank-you` works after a refresh. The repo includes the config for this:

| Host | File (already included) |
|---|---|
| Vercel | `vercel.json` |
| Netlify | `public/_redirects` |
| Apache / cPanel | `public/.htaccess` |
| Nginx | add `try_files $uri /index.html;` |

---

## 6. Deploy the frontend

The output is a static site, so any HTTPS host works.

**Vercel (recommended)**
1. Push the project to GitHub. Do **not** commit `.env`.
2. In Vercel: **Add New → Project**, import the repo. The framework is detected as **Vite**.
3. Under **Environment Variables**, add `VITE_GOOGLE_SCRIPT_URL` (and the optional catalogue URLs).
4. Click Deploy. Optionally add a custom domain, for example `catalogue.hogarcontrols.com`.

**Netlify:** build command `npm run build`, publish directory `dist`, plus the same env variables.

**cPanel / any static host:** run `npm run build` locally with `.env` filled in, then upload the **contents** of `dist/`, including the `.htaccess` file, to the web root.

### Post-deploy checklist
- [ ] The site opens over **HTTPS**.
- [ ] A test submission with **Hogar** adds a row in Sheets, downloads `Hogar-Catalogue.pdf` and shows the Thank You page.
- [ ] The same test with **DU** downloads `DU-Catalogue.pdf`.
- [ ] Refreshing `/thank-you` still shows the page. Opening `/thank-you` in a new tab redirects to the form.
- [ ] Tested on a real Android phone and a real iPhone.
- [ ] Test rows deleted from the sheet.

---

## 7. Generate the common QR code

1. Use the final production URL, for example `https://catalogue.hogarcontrols.com/`. Point the QR at **the form root**, not at `/thank-you`.
2. Generate the code with any free generator, or with the CLI:
   ```bash
   npx qrcode -o hogar-du-qr.png -w 1200 "https://catalogue.hogarcontrols.com/"
   ```
   For print, also export an SVG: `npx qrcode -t svg -o hogar-du-qr.svg "https://..."`.
3. Print tips: at least **3 × 3 cm** (larger for banners), dark code on a light background, keep the quiet margin, and scan-test the printed proof with several phones.
4. Optional: add tracking such as `?src=expo-stall` to the URL. The form ignores query parameters, so it keeps working.

One QR code serves both brands, because the visitor picks Hogar or DU in the form.

---

## 8. Customisation

| What | Where |
|---|---|
| Logos / DU logo / company details / links | `src/config/brand.js` (set `duLogo: '/brand/du-logo.png'` to show DU next to Hogar) |
| Dropdown options | `src/config/formOptions.js` **and** `ALLOWED_CATEGORIES` / `ALLOWED_COMPANIES` in `Code.gs` |
| Colours & fonts | CSS variables at the top of `src/index.css` (brand green `#57a818` / `#4d9916`, Public Sans, both from hogarcontrols.com) |
| Headings / copy | `src/pages/FormPage.jsx`, `src/components/SuccessMessage.jsx` |

---

## 9. Security notes
- The frontend contains only the public Apps Script URL. It holds no Google credentials or keys, because the script runs as **you** on Google's servers.
- All input is validated in the browser **and** in Apps Script. Values are sanitised against formula injection before they are written.
- Every endpoint uses HTTPS (Apps Script is HTTPS-only, and modern hosts serve HTTPS by default).
- Duplicate protection: the submit button is disabled and guarded against repeated taps, and the server de-duplicates by `submissionId`.
- Errors such as network failures, timeouts (25 s) and Apps Script errors show a clear message with a **Retry** button. The visitor's data stays in the form.
