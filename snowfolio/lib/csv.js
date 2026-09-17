// Minimal CSV parser (handles quoted fields, commas and escaped quotes)
// plus a mapper from CSV rows to transaction input objects.
//
// Expected header (case-insensitive, order-independent):
//   type, ticker, date, shares, price, amount, fee, note
//
// - type:   BUY | SELL | DIVIDEND (also accepts B/S/DIV, buy/sell/dividend)
// - date:   YYYY-MM-DD
// - amount: only needed for DIVIDEND rows

export function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const TYPE_MAP = {
  buy: "BUY",
  b: "BUY",
  sell: "SELL",
  s: "SELL",
  dividend: "DIVIDEND",
  div: "DIVIDEND",
  d: "DIVIDEND",
};

export function csvToTransactions(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one data row");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const cols = {
    type: idx("type"),
    ticker: idx("ticker"),
    date: idx("date"),
    shares: idx("shares"),
    price: idx("price"),
    amount: idx("amount"),
    fee: idx("fee"),
    note: idx("note"),
  };
  if (cols.type < 0 || cols.ticker < 0 || cols.date < 0) {
    throw new Error("CSV must have at least: type, ticker, date columns");
  }

  const get = (r, i) => (i >= 0 && i < r.length ? r[i].trim() : "");

  return rows.slice(1).map((r) => {
    const rawType = get(r, cols.type).toLowerCase();
    return {
      type: TYPE_MAP[rawType] || rawType.toUpperCase(),
      ticker: get(r, cols.ticker),
      date: get(r, cols.date),
      shares: get(r, cols.shares),
      price: get(r, cols.price),
      amount: get(r, cols.amount),
      fee: get(r, cols.fee) || 0,
      note: get(r, cols.note),
    };
  });
}

export const CSV_TEMPLATE =
  "type,ticker,date,shares,price,amount,fee,note\n" +
  "BUY,AAPL,2024-01-15,10,185,,1,initial buy\n" +
  "DIVIDEND,AAPL,2024-05-15,,,2.40,,q2 dividend\n" +
  "SELL,AAPL,2024-08-01,4,220,,1,trim position\n";
