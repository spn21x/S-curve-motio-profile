// Free, key-less market data via Yahoo Finance chart endpoint.
// We use the v8 chart API because it needs no crumb/cookie/auth:
//   - meta.regularMarketPrice  -> current price
//   - events.dividends         -> dividend history (last 12mo => annual rate)
//
// Results are cached in-process for a few minutes so a page render does not
// hammer Yahoo. For production you'd move this to a daily cron + real cache.

const CACHE = new Map(); // symbol -> { at, data }
const TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchOne(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=1y&interval=1d&events=div`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Snowfolio)" },
    // Next.js: don't cache at the fetch layer; we manage our own TTL.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${symbol}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const meta = result.meta || {};
  const price = Number(meta.regularMarketPrice) || 0;
  const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose) || 0;

  // Sum dividends paid in the trailing 12 months -> annual dividend/share.
  const divs = result.events?.dividends || {};
  const cutoff = Date.now() / 1000 - 365 * 24 * 3600;
  let annualDividend = 0;
  for (const key of Object.keys(divs)) {
    const d = divs[key];
    if (d && Number(d.date) >= cutoff) annualDividend += Number(d.amount) || 0;
  }

  return {
    symbol,
    currency: meta.currency || "USD",
    name: meta.longName || meta.shortName || symbol,
    price,
    prevClose,
    changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    annualDividend,
    dividendYield: price ? (annualDividend / price) * 100 : 0,
  };
}

export async function getQuote(symbol) {
  const key = symbol.toUpperCase();
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const data = await fetchOne(key);
    CACHE.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    // On failure, serve stale data if we have any; otherwise a null quote.
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
      error: String(err.message || err),
    };
  }
}

export async function getQuotes(symbols) {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const list = await Promise.all(unique.map((s) => getQuote(s)));
  const map = {};
  for (const q of list) map[q.symbol] = q;
  return map;
}
