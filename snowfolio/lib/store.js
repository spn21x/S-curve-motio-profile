import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Simple file-backed JSON store for transactions.
// Kept deliberately small so it can later be swapped for Supabase / Turso
// without touching the rest of the app — just re-implement these functions.

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "transactions.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf8");
}

export function readTransactions() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeTransactions(list) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
}

const TYPES = new Set(["BUY", "SELL", "DIVIDEND"]);

// Validate + normalize an incoming transaction payload.
export function normalizeTransaction(input) {
  const type = String(input.type || "").toUpperCase();
  if (!TYPES.has(type)) throw new Error("type must be BUY, SELL or DIVIDEND");

  const ticker = String(input.ticker || "").trim().toUpperCase();
  if (!ticker) throw new Error("ticker is required");

  const date = String(input.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date must be YYYY-MM-DD");

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const tx = {
    id: crypto.randomUUID(),
    type,
    ticker,
    date,
    fee: Math.max(0, num(input.fee)),
    note: String(input.note || "").slice(0, 200),
    createdAt: new Date().toISOString(),
  };

  if (type === "DIVIDEND") {
    tx.amount = num(input.amount); // total cash dividend received
    if (tx.amount <= 0) throw new Error("dividend amount must be > 0");
    tx.shares = 0;
    tx.price = 0;
  } else {
    tx.shares = num(input.shares);
    tx.price = num(input.price);
    if (tx.shares <= 0) throw new Error("shares must be > 0");
    if (tx.price < 0) throw new Error("price must be >= 0");
    tx.amount = tx.shares * tx.price;
  }

  return tx;
}

export function addTransaction(input) {
  const tx = normalizeTransaction(input);
  const list = readTransactions();
  list.push(tx);
  writeTransactions(list);
  return tx;
}

export function deleteTransaction(id) {
  const list = readTransactions();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  writeTransactions(next);
  return true;
}
