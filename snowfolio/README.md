# ❄️ Snowfolio

A low-cost **dividend snowball** tracker for foreign (US) stocks. Record your
buy / sell / dividend **transactions**, and Snowfolio derives your holdings,
pulls live prices + dividend data, and projects your future dividend income
(the "snowball").

## Concept

Snowball investing focuses on **growing dividend cash flow**, not just price.
Reinvest every dividend + keep adding money, and income compounds year over year.
Snowfolio shows:

- **Holdings** — derived from your transactions (average-cost accounting)
- **Yield on Cost (YoC)** — the real yield against what you paid
- **Annual / monthly dividend income**
- **Snowball projection** — reinvest dividends + monthly contributions, with a
  dividend-growth assumption, projected N years out

## Cost = $0

| Piece | Choice | Cost |
| --- | --- | --- |
| Framework | Next.js (App Router) | free |
| Market data | Yahoo Finance chart API (no key needed) | free |
| Storage | JSON file (`data/transactions.json`) | free |
| Hosting | Vercel / Cloudflare (see below) | free tier |

No API keys, no database to provision — it runs locally out of the box.

## Run locally

```bash
cd snowfolio
npm install
npm run dev
# open http://localhost:3000
```

## Data source

Prices and dividend history come from Yahoo Finance's public `v8/finance/chart`
endpoint (`lib/quotes.js`). It needs no auth. Quotes are cached in-process for
10 minutes. Trailing-12-month dividends are summed to estimate the annual rate.

> Yahoo Finance is an unofficial source — fine for personal / educational use.
> For commercial use, switch to a licensed feed (Financial Modeling Prep,
> Finnhub, Alpha Vantage). Only `lib/quotes.js` needs to change.

## Storage & deployment note

Transactions are stored in `data/transactions.json` — perfect for local use.
Serverless hosts (Vercel) have an **ephemeral** filesystem, so for a deployed,
multi-user version, swap `lib/store.js` for a hosted DB. Cheapest options:

- **Supabase** (Postgres, free tier)
- **Turso** (SQLite, free tier)

The store API is tiny (`readTransactions`, `addTransaction`, `deleteTransaction`)
so the swap is contained.

## Roadmap ideas

- Dividend calendar (upcoming ex-div / pay dates)
- Sector / country diversification breakdown
- CSV import from your broker
- Daily cron to snapshot prices instead of on-demand fetch
- User accounts (Supabase Auth)
