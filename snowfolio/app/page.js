"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { money, num, pct, cls } from "../lib/format";
import { projectSnowball } from "../lib/portfolio";
import Allocation from "./components/Allocation";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState(500);
  const [growth, setGrowth] = useState(7);
  const [years, setYears] = useState(20);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totals;
  const rows = (data?.rows || []).filter((r) => r.shares > 0);

  const projection = useMemo(() => {
    if (!totals) return [];
    return projectSnowball({
      startValue: totals.marketValue || totals.costBasis || 0,
      annualIncome: totals.annualIncome || 0,
      monthlyContribution: Number(monthly) || 0,
      dividendGrowth: (Number(growth) || 0) / 100,
      years: Number(years) || 20,
    });
  }, [totals, monthly, growth, years]);

  const maxIncome = Math.max(1, ...projection.map((p) => p.income));

  if (loading && !data) return <p className="subtle">Loading portfolio…</p>;

  const empty = rows.length === 0;

  return (
    <>
      <h1>Dashboard</h1>
      <p className="subtle">
        Your dividend snowball at a glance ·{" "}
        {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : ""}
        {totals && !totals.livePrices && !empty
          ? " · ⚠️ live prices unavailable — values estimated from cost"
          : ""}
      </p>

      {empty ? (
        <div className="panel empty">
          No holdings yet. Add your first{" "}
          <Link href="/transactions" style={{ color: "var(--accent)" }}>
            transaction →
          </Link>
        </div>
      ) : (
        <>
          <section className="stats">
            <div className="card">
              <div className="label">Market Value</div>
              <div className="value">{money(totals.marketValue)}</div>
              <div className={`sub ${cls(totals.unrealized)}`}>
                {pct(totals.unrealizedPct)} · {money(totals.unrealized)}
              </div>
            </div>
            <div className="card">
              <div className="label">Invested (cost)</div>
              <div className="value">{money(totals.costBasis)}</div>
              <div className="sub">realized {money(totals.realized)}</div>
            </div>
            <div className="card">
              <div className="label">Annual Dividends</div>
              <div className="value" style={{ color: "var(--accent)" }}>
                {money(totals.annualIncome)}
              </div>
              <div className="sub">~{money(totals.monthlyIncome)}/mo</div>
            </div>
            <div className="card">
              <div className="label">Yield on Cost</div>
              <div className="value">{num(totals.yieldOnCost)}%</div>
              <div className="sub">current yield {num(totals.portfolioYield)}%</div>
            </div>
            <div className="card">
              <div className="label">Dividends Received</div>
              <div className="value" style={{ color: "var(--green)" }}>
                {money(totals.dividendsReceived)}
              </div>
              <div className="sub">lifetime cash paid</div>
            </div>
          </section>

          <section className="panel">
            <h2>Holdings</h2>
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Shares</th>
                  <th>Avg Cost</th>
                  <th>Price</th>
                  <th>Mkt Value</th>
                  <th>Unrealized</th>
                  <th>Yield</th>
                  <th>YoC</th>
                  <th>Annual Inc.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ticker}>
                    <td className="tick">
                      {r.ticker}
                      <small>{r.name}</small>
                    </td>
                    <td>{num(r.shares, 4)}</td>
                    <td>{money(r.avgCost)}</td>
                    <td>
                      {money(r.price)}{" "}
                      <span className={cls(r.changePct)} style={{ fontSize: 11 }}>
                        {pct(r.changePct)}
                      </span>
                    </td>
                    <td>{money(r.marketValue)}</td>
                    <td className={cls(r.unrealized)}>
                      {money(r.unrealized)} ({pct(r.unrealizedPct)})
                    </td>
                    <td>{num(r.dividendYield)}%</td>
                    <td>{num(r.yieldOnCost)}%</td>
                    <td style={{ color: "var(--accent)" }}>{money(r.annualIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <Allocation allocation={data.allocation} />

          <section className="panel">
            <h2>❄️ Snowball Projection</h2>
            <div className="controls">
              <label className="field">
                Monthly contribution ($)
                <input
                  type="number"
                  value={monthly}
                  min="0"
                  onChange={(e) => setMonthly(e.target.value)}
                />
              </label>
              <label className="field">
                Dividend growth (%/yr)
                <input
                  type="number"
                  value={growth}
                  min="0"
                  onChange={(e) => setGrowth(e.target.value)}
                />
              </label>
              <label className="field">
                Years
                <input
                  type="number"
                  value={years}
                  min="1"
                  max="50"
                  onChange={(e) => setYears(e.target.value)}
                />
              </label>
            </div>
            <p className="subtle">
              Reinvesting all dividends + adding {money(Number(monthly) || 0)}/mo, assuming{" "}
              {num(Number(growth) || 0)}% annual dividend growth.
            </p>
            {projection
              .filter((p) => p.year % Math.max(1, Math.ceil(years / 12)) === 0 || p.year === years)
              .map((p) => (
                <div className="bar-row" key={p.year}>
                  <span className="yr">Yr {p.year}</span>
                  <div className="bar" style={{ width: `${(p.income / maxIncome) * 60}%` }} />
                  <span className="amt">
                    {money(p.income)}/yr · {money(p.monthlyIncome)}/mo
                  </span>
                </div>
              ))}
          </section>
        </>
      )}
    </>
  );
}
