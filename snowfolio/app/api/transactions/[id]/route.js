import { NextResponse } from "next/server";
import { deleteTransaction } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(_request, { params }) {
  const ok = await deleteTransaction(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
