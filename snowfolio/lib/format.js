export const money = (n, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const num = (n, d = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: d }).format(
    Number.isFinite(n) ? n : 0
  );

export const pct = (n) => `${n >= 0 ? "+" : ""}${num(n, 2)}%`;

export const cls = (n) => (n > 0 ? "pos" : n < 0 ? "neg" : "");
