import { NextResponse } from "next/server";
import { meetingState } from "@/lib/meeting-state";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await meetingState(id);
  if (!state) return NextResponse.json({ error: "Meeting niet gevonden" }, { status: 404 });
  return NextResponse.json(state);
}
