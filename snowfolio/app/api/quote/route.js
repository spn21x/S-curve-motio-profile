import { NextResponse } from "next/server";
import { getQuote } from "../../../lib/quotes";

export const dynamic = "force-dynamic";

// Lightweight lookup used by the transaction form to prefill the current price.
export async function GET(request) {
  const symbol = new URL(request.url).searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const q = await getQuote(symbol);
  return NextResponse.json(q);
}
