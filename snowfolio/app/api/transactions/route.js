import { NextResponse } from "next/server";
import { readTransactions, addTransaction } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = readTransactions().sort((a, b) =>
    a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1
  );
  return NextResponse.json(list);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const tx = addTransaction(body);
    return NextResponse.json(tx, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 });
  }
}
