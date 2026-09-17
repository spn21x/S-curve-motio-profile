// Pure functions: turn a flat list of transactions into holdings + totals.
// No I/O here so it's easy to unit-test.

// Build per-ticker holdings from BUY/SELL/DIVIDEND transactions.
// Uses average-cost accounting.
export function computeHoldings(transactions) {
  const byTicker = new Map();

  const get = (t) => {
    if (!byTicker.has(t)) {
      byTicker.set(t, {
        ticker: t,
        shares: 0,
        costBasis: 0, // total cost of currently-held shares
        invested: 0, // gross cash put in (BUY incl. fees)
        proceeds: 0, // gross cash taken out (SELL net of fees)
        dividends: 0, // total cash dividends received
        realized: 0, // realized gain/loss from sells
      });
    }
    return byTicker.get(t);
  };

  // Process in chronological order so average cost is correct.
  const ordered = [...transactions].sort((a, b) =>
    a.date === b.date ? (a.createdAt > b.createdAt ? 1 : -1) : a.date < b.date ? -1 : 1
  );

  for (const tx of ordered) {
    const h = get(tx.ticker);
    if (tx.type === "BUY") {
      h.shares += tx.shares;
      h.costBasis += tx.shares * tx.price + (tx.fee || 0);
      h.invested += tx.shares * tx.price + (tx.fee || 0);
    } else if (tx.type === "SELL") {
      const avg = h.shares > 0 ? h.costBasis / h.shares : 0;
      const sold = Math.min(tx.shares, h.shares);
      const soldCost = avg * sold;
      const netProceeds = sold * tx.price - (tx.fee || 0);
      h.realized += netProceeds - soldCost;
      h.shares -= sold;
      h.costBasis -= soldCost;
      h.proceeds += netProceeds;
      if (h.shares < 1e-9) {
        h.shares = 0;
        h.costBasis = 0;
      }
    } else if (tx.type === "DIVIDEND") {
      h.dividends += tx.amount || 0;
    }
  }

  return [...byTicker.values()];
}

// Enrich holdings with live quote data and compute portfolio totals.
export function enrich(holdings, quotes) {
  const rows = holdings.map((h) => {
    const q = quotes[h.ticker] || {};
    const avgCost = h.shares > 0 ? h.costBasis / h.shares : 0;
    // When a live price isn't available (offline / blocked / bad ticker),
    // fall back to average cost so the position doesn't read as -100%.
    const priceIsLive = (q.price || 0) > 0;
    const price = priceIsLive ? q.price : avgCost;
    const marketValue = h.shares * price;
    const unrealized = marketValue - h.costBasis;
    const annualIncome = h.shares * (q.annualDividend || 0);
    const yieldOnCost = h.costBasis > 0 ? (annualIncome / h.costBasis) * 100 : 0;

    return {
      ...h,
      name: q.name || h.ticker,
      currency: q.currency || "USD",
      price,
      priceIsLive,
      changePct: priceIsLive ? q.changePct || 0 : 0,
      avgCost,
      marketValue,
      unrealized,
      unrealizedPct: h.costBasis > 0 ? (unrealized / h.costBasis) * 100 : 0,
      annualDividendPerShare: q.annualDividend || 0,
      dividendYield: q.dividendYield || 0,
      annualIncome,
      yieldOnCost,
    };
  });

  // Sort by market value desc; held positions first.
  rows.sort((a, b) => b.marketValue - a.marketValue);

  const held = rows.filter((r) => r.shares > 0);

  const totals = {
    marketValue: sum(held, "marketValue"),
    costBasis: sum(held, "costBasis"),
    unrealized: sum(held, "unrealized"),
    realized: sum(rows, "realized"),
    dividendsReceived: sum(rows, "dividends"),
    annualIncome: sum(held, "annualIncome"),
  };
  totals.unrealizedPct = totals.costBasis > 0 ? (totals.unrealized / totals.costBasis) * 100 : 0;
  totals.portfolioYield = totals.marketValue > 0 ? (totals.annualIncome / totals.marketValue) * 100 : 0;
  totals.yieldOnCost = totals.costBasis > 0 ? (totals.annualIncome / totals.costBasis) * 100 : 0;
  totals.monthlyIncome = totals.annualIncome / 12;
  // True only if every held position has a live price.
  totals.livePrices = held.length > 0 && held.every((r) => r.priceIsLive);

  return { rows, totals };
}

function sum(arr, key) {
  return arr.reduce((acc, r) => acc + (r[key] || 0), 0);
}

// The "snowball": project annual dividend income forward, reinvesting all
// dividends and adding a fixed monthly contribution, with annual dividend
// growth. Returns one row per year.
export function projectSnowball({
  startValue,
  annualIncome,
  monthlyContribution = 0,
  dividendGrowth = 0.07, // per year
  priceGrowth = 0.04, // capital appreciation per year (approx)
  years = 20,
}) {
  const rows = [];
  let value = startValue;
  // Effective portfolio yield today (income / value).
  let yieldRate = startValue > 0 ? annualIncome / startValue : 0;
  const annualContribution = monthlyContribution * 12;

  for (let y = 1; y <= years; y++) {
    // Yield grows as companies raise dividends faster than price (net of priceGrowth).
    yieldRate = yieldRate * (1 + dividendGrowth) / (1 + priceGrowth);
    const income = value * yieldRate;
    // Reinvest dividends + contributions, then let price appreciate.
    value = (value + income + annualContribution) * (1 + priceGrowth);
    rows.push({
      year: y,
      income,
      monthlyIncome: income / 12,
      value,
    });
  }
  return rows;
}
