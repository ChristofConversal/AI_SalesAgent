"use client";

import type { MeetingState } from "@/lib/meeting-state";

export type { MeetingState };

export async function fetchState(id: string): Promise<MeetingState> {
  const res = await fetch(`/api/meetings/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}

export async function act(id: string, action: string, body: object = {}): Promise<{ notice: string | null; state: MeetingState }> {
  const res = await fetch(`/api/meetings/${id}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Status ${res.status}`);
  return json;
}

export function fmt(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${m}:${s}`;
}
