# PrepDock – Interview-Helper SaaS

🌐 Web Experience (Framer + Browser)
The front page (built in Framer) is designed to attract users and explain the product.

Users proceed through a billing step (Stripe integration coming later).

After payment, they are redirected to a lightweight web workspace:

Upload PDFs, resumes, job descriptions.

Access a prompt-based assistant for behavioral prep and content-driven Q&A.

🖥️ Desktop App (Electron)
To activate the real-time audio assistant, users must download the PrepDock Electron app.

On launch, users must log in again to sync their workspace context from the browser.

The app accesses uploaded documents and uses them to provide contextual voice-based responses.

🥷 Stealth & Minimal UX Goals
The desktop app should run in the background, with no taskbar icon or visible chrome.

App binary and windows should be renamed for discretion:

Use PrepDock.exe as the app name.

app.setName("PrepDock"), and title windows like "Updater" to blend in.

Electron windows should be non-focus-stealing and persistent, suitable for passive background use.

---

## TL;DR – local dev
```bash
# 1. install deps
npm install

# 2. env – copy and fill in your own keys
cp env.example .env

# 3. run renderer + electron
npm run dev        # vite dev-server on :5173
npm run dev:electron
```
Unit tests:
```bash
npm test
```

---

## High-level architecture
```
┌────────────────────────┐        ┌──────────────────────┐
│         Landing page   │──────▶ │   Stripe Checkout    │
└────────────────────────┘        └──────────────────────┘
                                         │ webhook
                                         ▼
┌────────────────────────┐        ┌──────────────────────┐
│  Next.js SaaS app      │◀───────│  Supabase + Postgres │
│  (app.prepdock.com)    │        └──────────────────────┘
│  – prompt editor       │
│  – doc uploads         │
│  – usage dashboard     │
└────────────────────────┘
           ▲   ▲
           │   │ JWT + refresh_token
           │   │
           │   └──────────────────┐
           │                      ▼
┌────────────────────────┐   ┌────────────────────────┐
│  PrepDock.exe (tray)   │   │   OpenAI Assistants    │
│  – overlay             │   └────────────────────────┘
│  – recorder            │
│  – OCR + transcript    │
└────────────────────────┘
```

---

## Roadmap & status

| Phase | Area | Feature | Status |
|-------|------|---------|--------|
| **0** | Tests | Jest + ESM harness <br/> Config, audio helper, prompt wrapper | ✅ done |
|       | Dev   | Tailwind 4 + Radix + React scaffold | ✅ done |
| **1** | SaaS   | Web workspace (Account/Billing/Docs/Behaviour) | *in progress* |
|       | SaaS   | Stripe checkout → Supabase sync | ⏳ next |
|       | Desktop | Tray entry, no task-bar, neutral titles | ⏳ planning |
| **2** | Desktop | IPC auth bridge (downloaded token, gate OpenAI) | ⏳ planning |
|       | Billing| Stripe webhooks & metered usage | ⏳ planning |
| **3** | Extras | Prompt template marketplace, team sharing | 🛣️ later |

### Current sprint – Web workspace foundation
- [x] React + Radix Tabs shell (browser)
- [x] Supabase magic-link sign-in
- [ ] Hook Stripe trial success → create Supabase user row
- [ ] File-upload endpoint (S3 presign)
- [ ] Prompt editor with live token count

### Up next
1. Reference-Docs tab
   - S3 presigned URL upload
   - Persist `{user_id, file_id, size}` in Supabase
   - Forward to `POST /v1/files` (OpenAI) automatically
2. Behaviour tab
   - Rich prompt editor with live token counter
   - Version history (up to 10 previous edits)
3. Billing tab
   - Stripe billing portal iframe
   - Usage meters (tokens, minutes, storage)
4. Auto-update + code-sign (electron-updater + GitHub Releases)

---

## Recent updates (2024-06)

### ✨ Web – Account Settings page
1. **Brand-new UI** – clean white cards, subtle borders, smooth hover animations, matching [Prismic](https://prismic.io/?ref=land-book.com) aesthetics.
2. **Provider-aware logic**
   - Email/password users see a **Change Password** form.
   - OAuth users (Google, GitHub, …) do **not** see password fields.
3. **Sign-out flow** – instantly refreshes NavBar/Hero to the logged-out state.
4. **Danger zone** – users can *permanently* delete their account (Supabase Admin API).

### 🔐 Environment variables
Add `SUPABASE_SERVICE_KEY` (service-role key) to `.env` / `.env.local` **inside the `web/` app** so the delete-account API can call `supabase.auth.admin.deleteUser()`.

```bash
# in web/
cp ../env.example .env.local # then fill in keys
```

---

## Contributing
1. Make sure `npm test` is green.  
2. Follow the coding style enforced by ESLint & Prettier.  
3. Submit PRs against the `dev` branch.

---

© PrepDock Inc.  All product names are intentionally generic for stealth.
