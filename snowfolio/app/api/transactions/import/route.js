import { NextResponse } from "next/server";
import { addTransactions } from "../../../../lib/store";
import { csvToTransactions } from "../../../../lib/csv";

export const dynamic = "force-dynamic";

// Accepts either JSON { csv: "..." } or a raw text/csv body.
export async function POST(request) {
  try {
    const ct = request.headers.get("content-type") || "";
    let text;
    if (ct.includes("application/json")) {
      const body = await request.json();
      text = body.csv;
    } else {
      text = await request.text();
    }
    if (!text || !text.trim()) throw new Error("empty CSV");

    const inputs = csvToTransactions(text);
    const result = await addTransactions(inputs);
    return NextResponse.json(result, { status: result.added > 0 ? 201 : 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 });
  }
}
