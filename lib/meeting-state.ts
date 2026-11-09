import { agentMode, defaultAgent, hasApiKey } from "./agent/engine";
import { loadDossier, needsEnrichment, suggestLink, talkRatio } from "./dossier";
import { getStore } from "./store";
import { loadFixtures } from "./fixtures";
import type { LeadEngineRecord } from "./store";

// Gesimuleerde verrijkingscascade: na deze tijd staat het resultaat van de Lead Engine klaar.
const ENRICH_MS = 4000;

export async function finishEnrichmentIfDue(rec: LeadEngineRecord | null): Promise<LeadEngineRecord | null> {
  if (!rec || rec.status !== "enriching") return rec;
  if (Date.now() - Date.parse(rec.updated_at) < ENRICH_MS) return rec;
  const result = loadFixtures().lead_engine_enrichment[rec.company_id];
  // Geen verrijkingsresultaat beschikbaar (bv. een lokaal testdossier): afgerond zonder extra gegevens.
  const done: LeadEngineRecord = result
    ? { ...rec, ...result, company_id: rec.company_id, updated_at: new Date().toISOString() }
    : { ...rec, status: "enriched", updated_at: new Date().toISOString() };
  await getStore().saveLeadEngine(done);
  return done;
}

export async function meetingState(id: string) {
  const store = getStore();
  const dossier = await loadDossier(id);
  if (!dossier) return null;
  const leadEngine = await finishEnrichmentIfDue(dossier.leadEngine);
  const segments = await store.listSegments(id);
  const total = loadFixtures().transcripts[id]?.length ?? 0;
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
    defaultAgent: defaultAgent(),
    hasApiKey: hasApiKey(),
    storeKind: store.kind,
  };
}

export type MeetingState = NonNullable<Awaited<ReturnType<typeof meetingState>>>;
