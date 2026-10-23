# BranchLedger

Daily sales, expenses and monthly profit & loss for **76 Branch** and **Extention Branch**, in Indian rupees. A standalone React + TypeScript app hosted on GitHub Pages. Lovable generated the initial calculation modules; the interface and static build were completed locally after the workspace exhausted its credits. No Lovable runtime, backend or subscription is required to run this exported app.

## Use

Open the published GitHub Pages app, add a sale or expense, and choose its date, branch, category, amount and payment method. The Overview shows monthly sales, expenses, profit and margin. Daily entries supports search, filters, editing, deletion and CSV exports. Monthly P&L compares the branches and combined totals with the previous month, and supports printing and CSV reports.

The app starts empty. **Explore demo data** opens fictional records in memory; it never writes them over your real ledger. Exit demo to return to your records. Branch names can be changed in Settings.

## Records stay on this device

This edition deliberately uses browser localStorage, following the GitHub-only requirement. Each browser profile, device and origin has its own ledger. **There is no automatic sharing or sync across devices.** No financial records are committed to GitHub. The public site contains application code only. There is no login or encryption of browser storage; use a trusted device/profile.

Download JSON backups from Settings regularly, before clearing browser data and before changing the app URL. Restore a backup on another device to transfer records manually. Merge skips duplicate IDs and preserves current versions of conflicting records; it does not synchronize deletions. Replace requires confirmation and overwrites all records and branch names. Export CSV for spreadsheets, JSON for recovery. Keep backups private.

## Accounting scope

All recorded amounts use integer paise. Sales − cost of sales = gross profit; gross profit − operating expenses = net profit. Zero sales produces N/A margin. Withdrawals and transfers are excluded from profit. The reports are **cash-based management reports**, not statutory accounts or tax returns. Record cost of goods sold/consumed, not the cost of unsold stock. Opening/closing inventory valuation, accruals, receivables, payables, depreciation, GST and tax treatment are not automated. Record appropriate period costs before relying on a monthly statement. The month uses the recorded local calendar date.

## Optional on-device AI

Insights includes deterministic observations and a genuine optional browser language-model integration. Rule-based observations are clearly distinguished from AI output. The optional assistant uses the browser's `LanguageModel` Prompt API with precomputed report context. It does not require an API key or send ledger data to a cloud AI API. A supported browser, suitable hardware, secure context, browser settings and an initial browser-provider model download may be required. When unavailable it explicitly shows **AI not connected**, without fake responses. This feature is not available on every phone/browser and actual generation cannot be guaranteed on unsupported hardware. AI can make mistakes; all official totals come from deterministic calculation code.

Browser model downloads are delivered by the browser provider, not GitHub. The app assets themselves are static and hosted on GitHub Pages; there are no external font or icon requests. Details: https://developer.chrome.com/docs/ai/prompt-api

## Develop

Install Node.js 22 or later, then run:

```sh
npm ci
npm run dev
npm test
npm run build
```

Production assets are in `dist/`. Vite uses `base: './'`, and navigation uses URL hashes so project subpaths work without server redirects. No environment variables or secrets are needed. `src/ledger/` contains the original calculation/storage modules and tests; `src/App.tsx` contains the React screens.

## GitHub Pages deployment

Push these source files to a new repository with default branch `main`. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. The included `Publish to GitHub Pages` workflow tests, builds and deploys on pushes to main; it can also be run manually under Actions. `Check app` validates pull requests. A public repository can use GitHub Pages on GitHub Free. Private-repository Pages availability depends on plan. See https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages.

Do not upload backups, private business records, secrets, node_modules, or .env files into this repository.

