# Financial Myself

A self-hosted personal finance app for envelope-style budgeting: split your income across purpose-built "buckets" (bills, daily spending, emergency fund, sinking funds, goals, debt), track transactions against them, and import bank statements straight from a PDF.

# Update & Fixed Bugs
🐾 Profile & pet companion, plus a dashboard cleanup
New

Profile page — set your name, age, and a profile picture.
Pet companion — adopt a dog, cat, or chicken. Your pet's mood and progress bar reflect how close you are to your savings goals overall, so it grows happier the more you contribute.
Fixed

Dashboard bucket cards no longer show leftover transactions from last month once a new month starts — each bucket now lists only the current month's activity, with a clear "No transactions yet this month" state when it's empty.

## Features

- **Buckets** — organize money into typed buckets (Daily Use, Bills, Entertainment, Emergency Fund, Sinking Fund, Goal, Debt, Other), each tied to an account and prioritized.
- **Allocation rules** — define percent- or fixed-amount rules per bucket, with priority ordering, and get an automatic suggestion for how to split a given income amount across buckets.
- **Recurring bills** — track monthly bills with due days against the bucket that funds them.
- **Goals & sinking funds** — set target amounts/dates for savings goals, and plan ahead for annual/irregular costs (e.g. insurance, car maintenance) by spreading them across months.
- **Transactions & categorization** — log income/expense transactions per account, with keyword-based category rules to auto-suggest a bucket.
- **Statement import** — upload a bank statement PDF, extract transactions locally, and optionally send the extracted text to Google Gemini ("Parse with AI") to structure rows and suggest buckets when local parsing isn't enough.
- **Analytics dashboard** — visualize spending and balances over time with charts.
- **Accounts & balance snapshots** — track checking/savings/investment accounts in multiple currencies with historical balance snapshots.
- **Auth** — email/password authentication (NextAuth, credentials provider, JWT sessions); all data is scoped per user.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Prisma](https://www.prisma.io) ORM with PostgreSQL
- [NextAuth](https://authjs.dev) for authentication
- [Tailwind CSS](https://tailwindcss.com) + [daisyUI](https://daisyui.com) + Radix UI for styling/components
- [Recharts](https://recharts.org) for analytics charts
- [Google Gemini API](https://aistudio.google.com) (optional) for AI-assisted statement parsing
- [unpdf](https://github.com/unjs/unpdf) for local PDF text extraction

## Getting started

### Prerequisites

- Node.js
- A PostgreSQL database

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — your PostgreSQL connection string.
   - `AUTH_SECRET` — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
   - `GEMINI_API_KEY` — optional, only needed for the "Parse with AI" fallback during statement import. Get a free key at [Google AI Studio](https://aistudio.google.com/apikey).

3. Run database migrations:

   ```bash
   npx prisma migrate dev
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), sign up, and start allocating.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production build
- `npm run lint` — lint the codebase

## License

Personal project — no license specified.
