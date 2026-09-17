import { NextResponse } from "next/server";
import { readTransactions } from "../../../lib/store";
import { getQuotes } from "../../../lib/quotes";
import { computeHoldings, enrich, buildAllocation } from "../../../lib/portfolio";

export const dynamic = "force-dynamic";

export async function GET() {
  const transactions = await readTransactions();
  const holdings = computeHoldings(transactions);
  const symbols = holdings.filter((h) => h.shares > 0).map((h) => h.ticker);
  const quotes = symbols.length ? await getQuotes(symbols) : {};
  const { rows, totals } = enrich(holdings, quotes);
  const allocation = buildAllocation(rows);
  return NextResponse.json({ rows, totals, allocation, updatedAt: new Date().toISOString() });
}
