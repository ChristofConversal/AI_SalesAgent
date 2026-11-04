import demo from "../fixtures/demo.json";
import { agentMode } from "./agent/engine";
import { loadDossier, needsEnrichment, suggestLink, talkRatio } from "./dossier";
import { getStore } from "./store";
import type { LeadEngineRecord, Segment } from "./store";

// Gesimuleerde verrijkingscascade: na deze tijd staat het resultaat van de Lead Engine klaar.
const ENRICH_MS = 4000;

const enrichment = demo.lead_engine_enrichment as Record<string, Omit<LeadEngineRecord, "company_id" | "updated_at">>;

export async function finishEnrichmentIfDue(rec: LeadEngineRecord | null): Promise<LeadEngineRecord | null> {
  if (!rec || rec.status !== "enriching") return rec;
  if (Date.now() - Date.parse(rec.updated_at) < ENRICH_MS) return rec;
  const result = enrichment[rec.company_id];
  const done: LeadEngineRecord = result
    ? { ...rec, ...result, company_id: rec.company_id, updated_at: new Date().toISOString() }
    : { ...rec, status: "enriched", icp_confidence: 0.5, updated_at: new Date().toISOString() };
  await getStore().saveLeadEngine(done);
  return done;
}

export async function meetingState(id: string) {
  const store = getStore();
  const dossier = await loadDossier(id);
  if (!dossier) return null;
  const leadEngine = await finishEnrichmentIfDue(dossier.leadEngine);
  const segments = await store.listSegments(id);
  const total = id === "m-lindeman" ? (demo.transcript as Omit<Segment, "meeting_id">[]).length : 0;
  return {
    ...dossier,
    leadEngine,
    linkSuggestion: dossier.meeting.company_id ? null : await suggestLink(dossier.meeting),
    needsEnrichment: dossier.company ? needsEnrichment(leadEngine) : false,
    segments,
    totalSegments: total,
    updates: await store.listUpdates(id),
    copilot: await store.getCopilot(id),
    feedback: await store.listFeedback(id),
    talk: talkRatio(segments),
    mode: agentMode(),
    storeKind: store.kind,
  };
}

export type MeetingState = NonNullable<Awaited<ReturnType<typeof meetingState>>>;
