// Free, key-less market data via Yahoo Finance.
//   - v8/finance/chart  -> price + dividend history (no auth needed)
//   - v10/finance/quoteSummary?modules=assetProfile -> sector/country
//     (best-effort; may be rate-limited or blocked — falls back to "Unknown")
//
// Results are cached in-process. For production you'd move this to a daily
// cron + real cache/DB.

const QUOTE_CACHE = new Map(); // symbol -> { at, data }
const PROFILE_CACHE = new Map(); // symbol -> { at, data }
const TTL_MS = 10 * 60 * 1000;
const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;

const UA = { "User-Agent": "Mozilla/5.0 (Snowfolio)" };

async function fetchChart(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=1y&interval=1d&events=div`;
  const res = await fetch(url, { headers: UA, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${symbol}`);

  const result = (await res.json())?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const meta = result.meta || {};
  const price = Number(meta.regularMarketPrice) || 0;
  const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose) || 0;

  // Dividend events in the trailing 12 months.
  const divEvents = result.events?.dividends || {};
  const cutoff = Date.now() / 1000 - 365 * 24 * 3600;
  const dividends = Object.values(divEvents)
    .filter((d) => d && Number(d.date) >= cutoff)
    .map((d) => ({
      date: new Date(Number(d.date) * 1000).toISOString().slice(0, 10),
      ts: Number(d.date),
      amount: Number(d.amount) || 0,
    }))
    .sort((a, b) => a.ts - b.ts);

  const annualDividend = dividends.reduce((s, d) => s + d.amount, 0);
  // Infer pay frequency from the number of payments in the last year.
  const n = dividends.length;
  const frequency = n >= 11 ? 12 : n >= 3 ? 4 : n === 2 ? 2 : n === 1 ? 1 : 0;

  return {
    symbol,
    currency: meta.currency || "USD",
    name: meta.longName || meta.shortName || symbol,
    price,
    prevClose,
    changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    annualDividend,
    dividendYield: price ? (annualDividend / price) * 100 : 0,
    dividends,
    frequency,
  };
}

export async function getQuote(symbol) {
  const key = symbol.toUpperCase();
  const hit = QUOTE_CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  try {
    const data = await fetchChart(key);
    QUOTE_CACHE.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (hit) return hit.data;
    return {
      symbol: key,
      currency: "USD",
      name: key,
      price: 0,
      prevClose: 0,
      changePct: 0,
      annualDividend: 0,
      dividendYield: 0,
      dividends: [],
      frequency: 0,
      error: String(err.message || err),
    };
  }
}

export async function getProfile(symbol) {
  const key = symbol.toUpperCase();
  const hit = PROFILE_CACHE.get(key);
  if (hit && Date.now() - hit.at < PROFILE_TTL_MS) return hit.data;

  const fallback = { sector: "Unknown", industry: "Unknown", country: "Unknown" };
  try {
    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(key)}` +
      `?modules=assetProfile`;
    const res = await fetch(url, { headers: UA, cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const p = (await res.json())?.quoteSummary?.result?.[0]?.assetProfile || {};
    const data = {
      sector: p.sector || "Unknown",
      industry: p.industry || "Unknown",
      country: p.country || "Unknown",
    };
    PROFILE_CACHE.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return fallback;
  }
}

export async function getQuotes(symbols) {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const list = await Promise.all(
    unique.map(async (s) => {
      const [q, profile] = await Promise.all([getQuote(s), getProfile(s)]);
      return { ...q, ...profile };
    })
  );
  const map = {};
  for (const q of list) map[q.symbol] = q;
  return map;
}
