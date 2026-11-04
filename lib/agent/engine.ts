import demo from "../../fixtures/demo.json";
import { claudeBriefing, claudeDebrief, claudeLive } from "./claude";
import { Briefing, Debrief, LiveUpdate } from "./schemas";

export type Source = "claude" | "scripted";

// auto = Claude als er een sleutel is, anders de vooraf geschreven antwoorden uit fixtures/demo.json.
export function agentMode(): Source {
  const mode = process.env.COPILOT_MODE ?? "auto";
  if (mode === "claude") return "claude";
  if (mode === "scripted") return "scripted";
  return process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? "claude" : "scripted";
}

export type Result<T> = { value: T; source: Source; error?: string };

async function run<T>(claude: () => Promise<T>, scripted: () => T): Promise<Result<T>> {
  if (agentMode() === "scripted") return { value: scripted(), source: "scripted" };
  try {
    return { value: await claude(), source: "claude" };
  } catch (e) {
    // De demo loopt door op het script; de tab toont waarom.
    return { value: scripted(), source: "scripted", error: e instanceof Error ? e.message : String(e) };
  }
}

export function liveUpdate(seq: number, dossier: string, previous: LiveUpdate | null, transcript: string, minute: number) {
  return run(
    () => claudeLive(dossier, previous, transcript, minute),
    () => LiveUpdate.parse(demo.scripted.updates[seq] ?? demo.scripted.updates.at(-1)),
  );
}

export function briefing(dossier: string) {
  return run(() => claudeBriefing(dossier), () => Briefing.parse(demo.scripted.briefing));
}

export function debrief(dossier: string, transcript: string) {
  return run(() => claudeDebrief(dossier, transcript), () => Debrief.parse(demo.scripted.debrief));
}
