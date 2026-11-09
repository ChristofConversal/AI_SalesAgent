import { loadFixtures } from "../fixtures";
import { claudeBriefing, claudeDebrief, claudeLive } from "./claude";
import { isAgentId, type AgentId } from "./models";
import { Briefing, Debrief, LiveUpdate } from "./schemas";

export type Source = "claude" | "scripted";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

// Standaardkeuze als de tab niets meegeeft: COPILOT_MODE en COPILOT_MODEL uit de omgeving.
// auto = Claude als er een sleutel is, anders de vooraf geschreven antwoorden van die meeting.
export function defaultAgent(): AgentId {
  const mode = process.env.COPILOT_MODE ?? "auto";
  const model = process.env.COPILOT_MODEL;
  const claude: AgentId = isAgentId(model) && model !== "scripted" ? model : "claude-opus-5-5";
  if (mode === "claude") return claude;
  if (mode === "scripted") return "scripted";
  return hasApiKey() ? claude : "scripted";
}

export function agentMode(agent?: AgentId): Source {
  return (agent ?? defaultAgent()) === "scripted" ? "scripted" : "claude";
}

// value is null als Claude niet beschikbaar is en er voor deze meeting geen script bestaat.
export type Result<T> = { value: T | null; source: Source; model: AgentId; error?: string };

const NO_SCRIPT = "Voor deze meeting zijn er geen vooraf geschreven antwoorden. Zet ANTHROPIC_API_KEY in .env.local en start de server opnieuw.";

async function run<T>(agent: AgentId | undefined, claude: (model: string) => Promise<T>, scripted: () => T | null): Promise<Result<T>> {
  const chosen = agent ?? defaultAgent();
  const fallback = (error?: string): Result<T> => {
    const value = scripted();
    return { value, source: "scripted", model: "scripted", error: value ? error : [error, NO_SCRIPT].filter(Boolean).join(" ") };
  };
  if (chosen === "scripted") return fallback();
  try {
    return { value: await claude(chosen), source: "claude", model: chosen };
  } catch (e) {
    // De demo loopt door op het script als dat bestaat; de tab toont waarom.
    return fallback(e instanceof Error ? e.message : String(e));
  }
}

function script(meetingId: string) {
  return loadFixtures().scripted[meetingId];
}

export function liveUpdate(
  agent: AgentId | undefined,
  meetingId: string,
  seq: number,
  dossier: string,
  previous: LiveUpdate | null,
  scriptState: string,
  transcript: string,
  minute: number,
) {
  return run(
    agent,
    (model) => claudeLive(model, dossier, previous, scriptState, transcript, minute),
    () => {
      const s = script(meetingId);
      const updates = s?.updates;
      if (!updates?.length) return null;
      // Vooraf geschreven: de basisupdate plus wat er in dit fragment in het script bijkomt.
      const events = (s?.script_events ?? []).find((e) => e.seq === seq);
      return LiveUpdate.parse({
        ...((updates[seq] ?? updates.at(-1)) as object),
        asked: events?.asked ?? [],
        answers: events?.answers ?? [],
        inserted: events?.inserted ?? [],
      });
    },
  );
}

export function briefing(agent: AgentId | undefined, meetingId: string, dossier: string) {
  return run(
    agent,
    (model) => claudeBriefing(model, dossier),
    () => {
      const b = script(meetingId)?.briefing;
      return b ? Briefing.parse(b) : null;
    },
  );
}

export function debrief(agent: AgentId | undefined, meetingId: string, dossier: string, transcript: string) {
  return run(
    agent,
    (model) => claudeDebrief(model, dossier, transcript),
    () => {
      const d = script(meetingId)?.debrief;
      return d ? Debrief.parse(d) : null;
    },
  );
}
