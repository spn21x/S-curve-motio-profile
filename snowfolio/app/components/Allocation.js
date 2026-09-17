"use client";

import { useState } from "react";
import { money, num } from "../../lib/format";
import { colorAt } from "../../lib/colors";

const VIEWS = [
  { key: "byTicker", label: "By holding" },
  { key: "bySector", label: "By sector" },
  { key: "byCountry", label: "By country" },
];

function Donut({ data }) {
  const size = 168;
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Allocation donut">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="18" />
      {data.map((d, i) => {
        const frac = d.value / total;
        const len = frac * circumference;
        const seg = (
          <circle
            key={d.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colorAt(i)}
            strokeWidth="18"
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += len;
        return seg;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--muted)" fontSize="11">
        Positions
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text)" fontSize="18" fontWeight="700">
        {data.length}
      </text>
    </svg>
  );
}

export default function Allocation({ allocation }) {
  const [view, setView] = useState("byTicker");
  if (!allocation) return null;
  const data = (allocation[view] || []).slice(0, 12);

  return (
    <section className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2>Diversification</h2>
        <div className="seg">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={`seg-btn ${view === v.key ? "active" : ""}`}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="alloc-grid">
        <Donut data={data} />
        <div className="legend">
          {data.map((d, i) => (
            <div className="legend-row" key={d.label}>
              <span className="dot" style={{ background: colorAt(i) }} />
              <span className="lg-label">{d.label}</span>
              <span className="lg-bar-wrap">
                <span className="lg-bar" style={{ width: `${d.pct}%`, background: colorAt(i) }} />
              </span>
              <span className="lg-val">
                {num(d.pct, 1)}% · {money(d.value)}
              </span>
            </div>
          ))}
          {data.length === 0 ? <p className="subtle">No positions.</p> : null}
        </div>
      </div>
      {view !== "byTicker" && data.some((d) => d.label === "Unknown") ? (
        <p className="subtle" style={{ marginTop: 8 }}>
          "Unknown" appears when sector/country data can't be fetched (offline or rate-limited).
        </p>
      ) : null}
    </section>
  );
}
