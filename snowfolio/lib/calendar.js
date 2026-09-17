// Build an upcoming-dividend calendar from each holding's recent payment
// history. We infer the pay cadence (frequency) and project the next ex-dates
// forward, estimating the amount from the most recent payment.
//
// These are ESTIMATES based on historical cadence — real ex-div/pay dates
// need a dedicated calendar feed. Good enough for a low-cost tracker, and
// clearly labelled as estimated in the UI.

export function buildCalendar(holdings, quotes, { months = 12 } = {}) {
  const events = [];
  const now = new Date();
  const horizon = new Date(now);
  horizon.setMonth(horizon.getMonth() + months);

  for (const h of holdings) {
    if (h.shares <= 0) continue;
    const q = quotes[h.ticker] || {};
    const divs = q.dividends || [];
    if (!divs.length || !q.frequency) continue;

    const last = divs[divs.length - 1];
    const intervalMonths = 12 / q.frequency;

    let d = new Date(`${last.date}T00:00:00Z`);
    let guard = 0;
    // Advance to the first date after today.
    while (d <= now && guard < 40) {
      d.setUTCMonth(d.getUTCMonth() + intervalMonths);
      guard++;
    }
    // Collect projected dates within the horizon.
    while (d <= horizon && guard < 80) {
      events.push({
        ticker: h.ticker,
        name: q.name || h.ticker,
        exDate: d.toISOString().slice(0, 10),
        amountPerShare: last.amount,
        shares: h.shares,
        estIncome: h.shares * last.amount,
        frequency: q.frequency,
        estimated: true,
      });
      d = new Date(d);
      d.setUTCMonth(d.getUTCMonth() + intervalMonths);
      guard++;
    }
  }

  events.sort((a, b) => (a.exDate < b.exDate ? -1 : a.exDate > b.exDate ? 1 : 0));

  // Group by calendar month for display.
  const byMonth = new Map();
  for (const e of events) {
    const m = e.exDate.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(e);
  }
  const months12 = [...byMonth.entries()].map(([month, items]) => ({
    month,
    items,
    total: items.reduce((s, e) => s + e.estIncome, 0),
  }));

  return { events, months: months12, total: events.reduce((s, e) => s + e.estIncome, 0) };
}
