import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Storage layer for transactions.
//
// Two backends, chosen automatically:
//   - Supabase (Postgres) when SUPABASE_URL + SUPABASE_SERVICE_KEY are set
//     (use this on Vercel / any serverless host — the filesystem is ephemeral)
//   - JSON file at data/transactions.json otherwise (zero-config local dev)
//
// All functions are async so the two backends share one interface.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_KEY);
const TABLE = "transactions";

const TYPES = new Set(["BUY", "SELL", "DIVIDEND"]);

// ---- shared validation -----------------------------------------------------

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
    tx.amount = num(input.amount);
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

// ---- JSON file backend -----------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "transactions.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf8");
}

function fileRead() {
  ensureFile();
  try {
    const arr = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function fileWrite(list) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
}

// ---- Supabase (PostgREST) backend -----------------------------------------

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Map between our camelCase objects and the snake_case DB column.
const toRow = (tx) => ({ ...tx, created_at: tx.createdAt, createdAt: undefined });
const fromRow = (r) => ({ ...r, createdAt: r.created_at });

async function sbRead() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=date.desc`,
    { headers: sbHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Supabase read ${res.status}`);
  return (await res.json()).map(fromRow);
}

async function sbInsert(tx) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(toRow(tx)),
  });
  if (!res.ok) throw new Error(`Supabase insert ${res.status}`);
}

async function sbDelete(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: sbHeaders({ Prefer: "return=representation" }) }
  );
  if (!res.ok) throw new Error(`Supabase delete ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

// ---- public interface ------------------------------------------------------

export async function readTransactions() {
  return USE_SUPABASE ? sbRead() : fileRead();
}

export async function addTransaction(input) {
  const tx = normalizeTransaction(input);
  if (USE_SUPABASE) {
    await sbInsert(tx);
  } else {
    const list = fileRead();
    list.push(tx);
    fileWrite(list);
  }
  return tx;
}

// Bulk insert (used by CSV import). Returns { added, errors }.
export async function addTransactions(inputs) {
  const errors = [];
  const valid = [];
  inputs.forEach((input, i) => {
    try {
      valid.push(normalizeTransaction(input));
    } catch (err) {
      errors.push({ row: i + 1, error: String(err.message || err) });
    }
  });

  if (valid.length) {
    if (USE_SUPABASE) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
        method: "POST",
        headers: sbHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(valid.map(toRow)),
      });
      if (!res.ok) throw new Error(`Supabase bulk insert ${res.status}`);
    } else {
      const list = fileRead();
      list.push(...valid);
      fileWrite(list);
    }
  }

  return { added: valid.length, errors };
}

export async function deleteTransaction(id) {
  if (USE_SUPABASE) return sbDelete(id);
  const list = fileRead();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  fileWrite(next);
  return true;
}

export const backend = USE_SUPABASE ? "supabase" : "json-file";
