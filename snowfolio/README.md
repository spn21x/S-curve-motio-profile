# ❄️ Snowfolio

A low-cost **dividend snowball** tracker for foreign (US) stocks. Record your
buy / sell / dividend **transactions**, and Snowfolio derives your holdings,
pulls live prices + dividend data, and projects your future dividend income
(the "snowball").

## Features

- **Transactions** — BUY / SELL / DIVIDEND with average-cost accounting;
  holdings and cost basis are derived from them
- **Dashboard** — market value, invested, annual/monthly dividends, yield on
  cost, dividends received
- **Diversification** — donut + bars by holding, sector and country
- **Dividend calendar** — projected ex-dates for the next 12 months, from each
  holding's payment cadence
- **Snowball projection** — reinvest dividends + monthly contributions with a
  dividend-growth assumption, projected N years out
- **CSV import** — paste or upload broker exports; downloadable template

## Cost = $0

| Piece | Choice | Cost |
| --- | --- | --- |
| Framework | Next.js (App Router) | free |
| Market data | Yahoo Finance (no API key) | free |
| Storage | JSON file locally · Supabase for hosting | free tier |
| Hosting | Vercel / Cloudflare | free tier |

No API keys needed to run locally.

## Run locally

```bash
cd snowfolio
npm install
npm run dev
# open http://localhost:3000
```

Transactions are stored in `data/transactions.json` — no setup required.

## Data source

Prices and dividend history come from Yahoo Finance's public
`v8/finance/chart` endpoint (`lib/quotes.js`) — no auth. Sector/country come
from `quoteSummary` (best-effort; falls back to "Unknown"). Quotes are cached
in-process for 10 minutes.

> Yahoo Finance is unofficial — fine for personal/educational use. For
> commercial use switch to a licensed feed (Financial Modeling Prep, Finnhub,
> Alpha Vantage). Only `lib/quotes.js` needs to change.
>
> Note: some hosting/sandbox networks block outbound calls to finance hosts.
> When live data can't be fetched, the app degrades gracefully (values fall
> back to average cost and show a "live prices unavailable" hint).

## Storage backends

`lib/store.js` picks a backend automatically:

- **JSON file** (`data/transactions.json`) when no env vars are set — great for
  local dev.
- **Supabase (Postgres)** when `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` are set
  — required for serverless hosting, where the filesystem is ephemeral.

### Set up Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy your project URL and **service role** key (Settings → API).
4. Set env vars (see `.env.example`). Never expose the service key to the browser.

## Deploy to Vercel (free)

1. Push this repo to GitHub (the `snowfolio/` folder is the project root).
2. Import it at [vercel.com/new](https://vercel.com/new); set the **Root
   Directory** to `snowfolio`.
3. Add the env vars `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
4. Deploy. Vercel builds `next build` and serves it globally.

## Roadmap ideas

- Real ex/pay dates from a dividend calendar feed
- Multi-user accounts (Supabase Auth)
- Daily cron price snapshots instead of on-demand fetch
- FX handling for non-USD holdings
