"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money, num } from "../../lib/format";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

export default function CalendarPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/calendar", { cache: "no-store" });
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="subtle">Loading calendar…</p>;

  const months = data?.months || [];

  return (
    <>
      <h1>Dividend Calendar</h1>
      <p className="subtle">
        Projected ex-dividend dates for the next 12 months, estimated from each
        holding's recent payment cadence.
      </p>

      {months.length === 0 ? (
        <div className="panel empty">
          No upcoming dividends to show. This needs held positions with dividend
          history (and live data access).{" "}
          <Link href="/transactions" style={{ color: "var(--accent)" }}>
            Add transactions →
          </Link>
        </div>
      ) : (
        <>
          <section className="stats">
            <div className="card">
              <div className="label">Est. 12-mo income</div>
              <div className="value" style={{ color: "var(--accent)" }}>
                {money(data.total)}
              </div>
              <div className="sub">~{money(data.total / 12)}/mo average</div>
            </div>
            <div className="card">
              <div className="label">Payments ahead</div>
              <div className="value">
                {months.reduce((s, m) => s + m.items.length, 0)}
              </div>
              <div className="sub">across {months.length} months</div>
            </div>
          </section>

          <section className="panel">
            {months.map((m) => (
              <div className="cal-month" key={m.month}>
                <h3>
                  <span>{monthLabel(m.month)}</span>
                  <span style={{ color: "var(--accent)" }}>{money(m.total)}</span>
                </h3>
                {m.items.map((e, i) => (
                  <div className="cal-item" key={`${e.ticker}-${e.exDate}-${i}`}>
                    <span className="date">{e.exDate.slice(5)}</span>
                    <span>
                      <strong>{e.ticker}</strong>{" "}
                      <span className="subtle">
                        {money(e.amountPerShare)}/sh × {num(e.shares, 2)}
                      </span>
                    </span>
                    <span className="inc">{money(e.estIncome)}</span>
                  </div>
                ))}
              </div>
            ))}
            <p className="subtle">Estimated — verify ex/pay dates with your broker.</p>
          </section>
        </>
      )}
    </>
  );
}
