This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
PrepDock is a privacy-focused, AI-powered interview assistant that blends a seamless online UX with a discreet desktop app.

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



## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
