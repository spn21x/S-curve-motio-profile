import { NextResponse } from "next/server";
import { readTransactions } from "../../../lib/store";
import { getQuotes } from "../../../lib/quotes";
import { computeHoldings } from "../../../lib/portfolio";
import { buildCalendar } from "../../../lib/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const transactions = await readTransactions();
  const holdings = computeHoldings(transactions).filter((h) => h.shares > 0);
  const quotes = holdings.length ? await getQuotes(holdings.map((h) => h.ticker)) : {};
  const calendar = buildCalendar(holdings, quotes, { months: 12 });
  return NextResponse.json({ ...calendar, updatedAt: new Date().toISOString() });
}
