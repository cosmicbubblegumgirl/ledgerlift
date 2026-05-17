# LedgerLift

Cash-flow foresight for small business decisions.

## What is included

- App-style dashboard, workspace, product, documents, database, login, and case-study pages.
- Editable embedded finance documents: cash-flow statement, invoice tracker, expense register, tax reserve worksheet, payroll runbook, and supplier payment calendar.
- Interactive what-if scenario lab for late invoices, inventory, new contracts, and hiring.
- Cash playbook presets for Protect Payroll, Chase Collections, and Fund Growth.
- Floating command palette (`Ctrl/Cmd + K`) for strategy switching, database navigation, and record search.
- Cash constellation signal map, risk triage cards, and adaptive product modes.
- Local Node API for login, database records, document snapshots, and reset.
- Static JSON fallback for hosting environments that cannot run Node.
- 200 preloaded cash-flow records generated into `api/data.json` and `server/db.json`.

## Run locally

```bash
npm start
```

Open `http://localhost:4174`.

Demo accounts:

- `simone@ledgerlift.demo` / `demo123`
- `owner@ledgerlift.demo` / `cashflow`
- `advisor@ledgerlift.demo` / `advisor123`

Regenerate seed data:

```bash
npm run seed
```
