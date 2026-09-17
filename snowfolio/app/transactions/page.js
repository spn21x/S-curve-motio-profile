"use client";

import { useEffect, useState } from "react";
import { money, num } from "../../lib/format";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  type: "BUY",
  ticker: "",
  date: today(),
  shares: "",
  price: "",
  amount: "",
  fee: "0",
  note: "",
});

export default function TransactionsPage() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState(null);

  async function load() {
    const res = await fetch("/api/transactions", { cache: "no-store" });
    setList(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Look up the current price when the ticker field loses focus.
  async function lookup() {
    const t = form.ticker.trim().toUpperCase();
    if (!t) return;
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(t)}`);
      const q = await res.json();
      setQuote(q);
      if (q.price && (form.type === "BUY" || form.type === "SELL")) {
        setForm((f) => ({ ...f, price: f.price || String(q.price) }));
      }
    } catch {
      setQuote(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setForm(emptyForm());
      setQuote(null);
      await load();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    await load();
  }

  const isDividend = form.type === "DIVIDEND";

  return (
    <>
      <h1>Transactions</h1>
      <p className="subtle">Record buys, sells and dividends. Holdings are derived from these.</p>

      <section className="panel">
        <h2>Add transaction</h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              Type
              <select value={form.type} onChange={set("type")}>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
                <option value="DIVIDEND">Dividend</option>
              </select>
            </label>
            <label className="field">
              Ticker
              <input
                value={form.ticker}
                onChange={set("ticker")}
                onBlur={lookup}
                placeholder="AAPL"
                autoCapitalize="characters"
              />
            </label>
            <label className="field">
              Date
              <input type="date" value={form.date} onChange={set("date")} />
            </label>

            {isDividend ? (
              <label className="field">
                Amount received ($)
                <input
                  type="number"
                  step="any"
                  value={form.amount}
                  onChange={set("amount")}
                  placeholder="42.50"
                />
              </label>
            ) : (
              <>
                <label className="field">
                  Shares
                  <input
                    type="number"
                    step="any"
                    value={form.shares}
                    onChange={set("shares")}
                    placeholder="10"
                  />
                </label>
                <label className="field">
                  Price / share ($)
                  <input
                    type="number"
                    step="any"
                    value={form.price}
                    onChange={set("price")}
                    placeholder="190.00"
                  />
                </label>
              </>
            )}

            <label className="field">
              Fee ($)
              <input type="number" step="any" value={form.fee} onChange={set("fee")} />
            </label>
            <label className="field">
              Note
              <input value={form.note} onChange={set("note")} placeholder="optional" />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
        {quote && quote.price ? (
          <p className="subtle" style={{ marginTop: 10 }}>
            {quote.symbol} · {quote.name} — last {money(quote.price)} · div/yr{" "}
            {money(quote.annualDividend)} ({num(quote.dividendYield)}%)
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel">
        <h2>History ({list.length})</h2>
        {list.length === 0 ? (
          <div className="empty">No transactions yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Price</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>
                    <span className={`badge ${t.type}`}>{t.type}</span>
                  </td>
                  <td className="tick">{t.ticker}</td>
                  <td>{t.type === "DIVIDEND" ? "—" : num(t.shares, 4)}</td>
                  <td>{t.type === "DIVIDEND" ? "—" : money(t.price)}</td>
                  <td>{money(t.amount)}</td>
                  <td>{money(t.fee)}</td>
                  <td style={{ textAlign: "left", color: "var(--muted)" }}>{t.note}</td>
                  <td>
                    <button className="ghost" onClick={() => remove(t.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
