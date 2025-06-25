# PrepDock – Interview-Helper → SaaS

> Desktop overlay + Web workspace for realistic interview practice powered by OpenAI Assistants.

---

## 0  Current status (June 2025)

| Area | What we already have |
|------|----------------------|
| Electron overlay | • Screen/audio capture with live transcript overlay  <br/>• Screenshot → OCR → "Ask AI" pane  <br/>• Behavioural assistant streaming (GPT-4o)  <br/>• FFmpeg device enumeration & configurable mic / system-audio  |
| Core helpers | • `electron/audioDevices.js` – FFmpeg device parser (unit-tested)  <br/>• `electron/promptHelpers.js` – `wrapQuestion()` & tone constants (unit-tested) |
| Test safety-net | Jest + ESM; three green suites (`config`, `audioDevices`, `wrapQuestion`) wired to run in CI |
| Settings window | React + Radix + Tailwind scaffold with 4 tabs  <br/>• "Account" tab: Supabase magic-link sign-in |
| Build tooling | Vite multi-page build (`index.html`, `settings.html`) + Tailwind v4  |

---

## 1  Environment variables

Create a local `.env` (or copy `env.example`) and provide:

```
VITE_SUPABASE_URL=   # e.g. https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OCR_SPACE_API_KEY=
ASSEMBLYAI_API_KEY=
```

Run dev servers:

```bash
npm install           # once
npm run dev           # Vite renderer
npm run dev:electron  # Electron main (optional helper script)
```

---

## 2  Near-term roadmap

So for our service I was hoping for a online seamless experience - a framer frontpage to attrach users, then billing, then after billing users have their own workspace where they gain access to prompt engineer + file upload (behavioral), and our service by clicking a start interview button. 
### A.  Auth session → Main process  *(blocking)*
- [ ] Store Supabase `refresh_token` in Keytar after sign-in.
- [ ] On app launch restore token: `supabase.auth.setSession()` inside Settings preload.
- [ ] IPC `get-current-user` & `user-updated` so Electron main knows the user id/email.
- [ ] Guard all OpenAI / upload calls: prompt user to sign-in when missing.

### B.  Billing (Stripe)
- [ ] Hosted Checkout → `users.plan` in Supabase via webhook.
- [ ] Billing tab shows current plan & usage; "Upgrade" button.

### C.  Reference Docs uploader
- [ ] S3 (or R2) signed PUT → row in `files` table.
- [ ] Immediately forward file to OpenAI `/files` (purpose:`assistants`).
- [ ] Surface per-assistant 20-file counter.

### D.  Behaviour prompt editor
- [ ] Textarea with live token meter.
- [ ] Auto-save versions → `prompts` table; allow restore.

### E.  Desktop ↔ Web coherence
- [ ] Deep link `prepdock://start?assistant=behavioural` to open overlay from web.
- [ ] Share Supabase session between devices (JWT refresh).

### F.  CI / Release
- [ ] GitHub Actions `npm ci && npm test` gate.
- [ ] Electron auto-update (electron-builder + GitHub Releases).

---

## 3  Task checklist (living document)

- [x] Extract `listAudioDevices()`  → **audioDevices.js** & add unit test
- [x] Extract `wrapQuestion()`   → **promptHelpers.js** & add unit test
- [x] Green Jest baseline in CI
- [x] Settings window scaffold (React + Tailwind)
- [ ] Persist Supabase session (Keytar) & IPC bridge
- [ ] Stripe Checkout + webhook → plan column
- [ ] Reference-Docs uploads + OpenAI `/files`
- [ ] Prompt editor with token counter
- [ ] Electron menu → open Settings window
- [ ] Public Framer marketing site

Tick items as they land in PRs.

---

## 4  Contributing / dev tips

```bash
npm run dev          # renderer (http://localhost:5173)
npm run dev:electron # main process – auto-relaunch on changes
npm test             # run Jest suites
```

Tailwind is v4 — classes purge automatically via the new `content` globs.

---

Happy shipping! 🛫
