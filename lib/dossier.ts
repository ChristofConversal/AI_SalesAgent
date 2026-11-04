import { getStore } from "./store";
import type { Company, Deal, LeadEngineRecord, Meeting, Segment } from "./store";

export type Dossier = {
  meeting: Meeting;
  company: Company | null;
  deals: Deal[];
  leadEngine: LeadEngineRecord | null;
};

export async function loadDossier(meetingId: string): Promise<Dossier | null> {
  const store = getStore();
  const meeting = await store.getMeeting(meetingId);
  if (!meeting) return null;
  const company = meeting.company_id ? await store.getCompany(meeting.company_id) : null;
  const deals = company ? await store.listDeals(company.id) : [];
  const leadEngine = company ? await store.getLeadEngine(company.id) : null;
  return { meeting, company, deals, leadEngine };
}

// Bekend is niet hetzelfde als verrijkt (les uit de test met een echt dossier).
export function needsEnrichment(rec: LeadEngineRecord | null): boolean {
  if (!rec) return true;
  if (rec.status === "enriching") return false;
  return rec.fte === null || rec.revenue_eur === null || rec.web === null || (rec.icp_confidence ?? 0) < 0.5;
}

// Koppelvoorstel: bedrijf waarvan het domein overeenkomt met de e-mail van een deelnemer,
// of waarvan de naam in de titel staat.
export async function suggestLink(meeting: Meeting): Promise<{ company: Company; deal: Deal | null } | null> {
  const store = getStore();
  const companies = await store.listCompanies();
  const domains = meeting.participants.map((p) => p.email?.split("@")[1]).filter(Boolean);
  const title = meeting.title.toLowerCase();
  const company =
    companies.find((c) => c.domain && domains.includes(c.domain)) ??
    companies.find((c) => title.includes(c.name.toLowerCase().split(" ")[0]));
  if (!company) return null;
  const deals = await store.listDeals(company.id);
  return { company, deal: deals.find((d) => d.stage !== "Won" && d.stage !== "Lost") ?? null };
}

export function dossierText(d: Dossier): string {
  const lines: string[] = [];
  lines.push(`Meeting: ${d.meeting.title} (${d.meeting.kind}, ${d.meeting.started_at.slice(0, 10)}, ${d.meeting.duration_min} min gepland)`);
  lines.push(`Deelnemers: ${d.meeting.participants.map((p) => `${p.name} (${p.role}, ${p.side})`).join("; ")}`);
  if (d.company) {
    lines.push(`Bedrijf (Central): ${d.company.name}, ${d.company.city ?? "?"}, btw ${d.company.vat ?? "onbekend"}, domein ${d.company.domain ?? "onbekend"}, sector ${d.company.sector ?? "onbekend"}`);
  } else {
    lines.push("Bedrijf: meeting nog niet gekoppeld.");
  }
  for (const deal of d.deals) lines.push(`Deal (Central): ${deal.title}, fase ${deal.stage}, bedrag ${deal.amount ?? "onbekend"}`);
  const le = d.leadEngine;
  if (le) {
    lines.push(`Lead Engine: status ${le.status}, ICP-score ${le.icp_score ?? "?"} (zekerheid ${le.icp_confidence ?? "?"}), VTE ${le.fte ?? "?"}, omzet ${le.revenue_eur ?? "?"}, brutomarge ${le.gross_margin_eur ?? "?"}`);
    for (const s of le.signals) lines.push(`Signaal (${s.type}, ${s.date}): ${s.text}`);
    if (le.leadinfo) lines.push(`Leadinfo: bezoeken ${le.leadinfo.first_visit} tot ${le.leadinfo.last_visit}, pagina's ${le.leadinfo.pages.join(", ")}`);
    if (le.web) lines.push(`Websitescan: ${le.web.cms}, PageSpeed ${le.web.pagespeed}, ${le.web.keywords} keywords`);
  } else {
    lines.push("Lead Engine: geen gegevens.");
  }
  return lines.join("\n");
}

export function minuteOf(seg: Segment): number {
  return Math.round(seg.end_ms / 60000);
}

export function transcriptText(segments: Segment[]): string {
  return segments
    .map((s) => {
      const mm = Math.floor(s.start_ms / 60000);
      const ss = String(Math.floor((s.start_ms % 60000) / 1000)).padStart(2, "0");
      return `[${mm}:${ss}]\n` + s.utterances.map((u) => `${u.speaker} (${u.channel === "mic" ? "admin" : "klant"}): ${u.text}`).join("\n");
    })
    .join("\n\n");
}

// Spreektijd uit de kanalen (mic = admin, system = klant), op basis van het aantal woorden.
export function talkRatio(segments: Segment[]): { client_pct: number; admin_pct: number } {
  let admin = 0;
  let client = 0;
  for (const s of segments) {
    for (const u of s.utterances) {
      const words = u.text.split(/\s+/).length;
      if (u.channel === "mic") admin += words;
      else client += words;
    }
  }
  const total = admin + client || 1;
  return { client_pct: Math.round((client / total) * 100), admin_pct: Math.round((admin / total) * 100) };
}
