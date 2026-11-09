import { NextResponse } from "next/server";
import { briefing, debrief, liveUpdate } from "@/lib/agent/engine";
import { dossierText, loadDossier, minuteOf, needsEnrichment, transcriptText } from "@/lib/dossier";
import { loadFixtures } from "@/lib/fixtures";
import { finishEnrichmentIfDue, meetingState } from "@/lib/meeting-state";
import { getStore } from "@/lib/store";
import type { Segment } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string; action: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id, action } = await params;
  const store = getStore();
  const dossier = await loadDossier(id);
  if (!dossier) return NextResponse.json({ error: "Meeting niet gevonden" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, string | null>;
  let notice: string | undefined;

  switch (action) {
    // Koppelvoorstel bevestigen: meeting hangt daarna aan bedrijf en deal.
    case "link": {
      if (!body.companyId) return NextResponse.json({ error: "companyId ontbreekt" }, { status: 400 });
      await store.linkMeeting(id, body.companyId, body.dealId ?? null);
      const rec = await store.getLeadEngine(body.companyId);
      // Bekend maar niet verrijkt: start de cascade meteen.
      if (needsEnrichment(rec)) await startEnrichment(body.companyId);
      break;
    }

    case "enrich": {
      if (!dossier.company) return NextResponse.json({ error: "Meeting is niet gekoppeld" }, { status: 400 });
      await startEnrichment(dossier.company.id);
      break;
    }

    case "briefing": {
      const le = await finishEnrichmentIfDue(dossier.leadEngine);
      const r = await briefing(id, dossierText({ ...dossier, leadEngine: le }));
      if (!r.value) return NextResponse.json({ error: r.error }, { status: 503 });
      const copilot = await store.getCopilot(id);
      await store.saveCopilot({ ...copilot, briefing: { ...r.value, source: r.source, created_at: new Date().toISOString() } });
      notice = r.error;
      break;
    }

    // Volgend fragment van het (fictieve) gesprek binnenhalen en de agent laten reageren.
    // In Central gebeurt dit wanneer de recorder een nieuw segment wegschrijft.
    case "segment": {
      const script = loadFixtures().transcripts[id];
      if (!script) return NextResponse.json({ error: "Deze meeting heeft geen testgesprek" }, { status: 400 });
      const done = await store.listSegments(id);
      const next = script[done.length];
      if (!next) break;
      const seg: Segment = { ...next, meeting_id: id } as Segment;
      const segments = [...done, seg];
      const updates = await store.listUpdates(id);
      const previous = updates.at(-1)?.payload ?? null;
      const minute = minuteOf(seg);
      const started = Date.now();
      const r = await liveUpdate(id, seg.seq, dossierText(dossier), previous, transcriptText(segments), minute);
      if (!r.value) {
        // Geen antwoord van de agent: het fragment blijft wachten.
        notice = r.error;
        break;
      }
      await store.addSegment(seg);
      await store.addUpdate({
        meeting_id: id,
        seq: seg.seq,
        t: minute,
        payload: { ...r.value, t: minute },
        source: r.source,
        latency_ms: Date.now() - started,
        created_at: new Date().toISOString(),
      });
      notice = r.error;
      break;
    }

    case "debrief": {
      const segments = await store.listSegments(id);
      if (segments.length === 0) return NextResponse.json({ error: "Nog geen transcript" }, { status: 400 });
      const r = await debrief(id, dossierText(dossier), transcriptText(segments));
      if (!r.value) return NextResponse.json({ error: r.error }, { status: 503 });
      const copilot = await store.getCopilot(id);
      await store.saveCopilot({ ...copilot, debrief: { ...r.value, source: r.source, created_at: new Date().toISOString() } });
      notice = r.error;
      break;
    }

    case "feedback": {
      if (!body.suggestion_id || (body.action !== "gesteld" && body.action !== "niet_relevant")) {
        return NextResponse.json({ error: "suggestion_id en action zijn nodig" }, { status: 400 });
      }
      await store.addFeedback({ meeting_id: id, suggestion_id: body.suggestion_id, action: body.action, created_at: new Date().toISOString() });
      break;
    }

    case "reset": {
      await store.resetMeeting(id);
      break;
    }

    default:
      return NextResponse.json({ error: `Onbekende actie ${action}` }, { status: 404 });
  }

  return NextResponse.json({ notice: notice ?? null, state: await meetingState(id) });
}

async function startEnrichment(companyId: string) {
  const store = getStore();
  const rec = await store.getLeadEngine(companyId);
  await store.saveLeadEngine({
    company_id: companyId,
    status: "enriching",
    icp_score: rec?.icp_score ?? null,
    icp_confidence: rec?.icp_confidence ?? null,
    fte: rec?.fte ?? null,
    revenue_eur: rec?.revenue_eur ?? null,
    gross_margin_eur: rec?.gross_margin_eur ?? null,
    signals: rec?.signals ?? [],
    leadinfo: rec?.leadinfo ?? null,
    web: rec?.web ?? null,
    updated_at: new Date().toISOString(),
  });
}
