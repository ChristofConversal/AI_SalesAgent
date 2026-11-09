import fs from "node:fs";
import path from "node:path";
import demo from "../fixtures/demo.json";
import type { Company, Deal, LeadEngineRecord, Meeting, Segment } from "./store/types";

// Demodata uit fixtures/demo.json, aangevuld met lokale testdossiers uit fixtures/local/*.json.
// fixtures/local/ staat in .gitignore: daar mogen gegevens van echte bedrijven in, ze verlaten
// deze machine niet via de repo.

type ScriptEvents = { seq: number; asked?: unknown[]; answers?: unknown[]; inserted?: unknown[] };
type ScriptedSet = { briefing?: unknown; updates?: unknown[]; debrief?: unknown; script_events?: ScriptEvents[] };
type Enrichment = Omit<LeadEngineRecord, "company_id" | "updated_at">;

export type Fixtures = {
  companies: Company[];
  deals: Deal[];
  meetings: Meeting[];
  lead_engine: LeadEngineRecord[];
  lead_engine_enrichment: Record<string, Enrichment>;
  transcripts: Record<string, Omit<Segment, "meeting_id">[]>;
  scripted: Record<string, ScriptedSet>;
};

type LocalFile = Partial<Omit<Fixtures, "transcripts" | "scripted">> & {
  transcripts?: Fixtures["transcripts"];
  scripted?: Fixtures["scripted"];
};

const LOCAL_DIR = path.join(process.cwd(), "fixtures", "local");

export function loadFixtures(): Fixtures {
  const f: Fixtures = {
    companies: demo.companies as Company[],
    deals: demo.deals as Deal[],
    meetings: demo.meetings as Meeting[],
    lead_engine: demo.lead_engine as LeadEngineRecord[],
    lead_engine_enrichment: demo.lead_engine_enrichment as Record<string, Enrichment>,
    transcripts: { "m-lindeman": demo.transcript as Omit<Segment, "meeting_id">[] },
    scripted: { "m-lindeman": demo.scripted },
  };
  if (!fs.existsSync(LOCAL_DIR)) return f;
  for (const name of fs.readdirSync(LOCAL_DIR).filter((n) => n.endsWith(".json")).sort()) {
    const local = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, name), "utf8")) as LocalFile;
    f.companies = [...f.companies, ...(local.companies ?? [])];
    f.deals = [...f.deals, ...(local.deals ?? [])];
    f.meetings = [...f.meetings, ...(local.meetings ?? [])];
    f.lead_engine = [...f.lead_engine, ...(local.lead_engine ?? [])];
    Object.assign(f.lead_engine_enrichment, local.lead_engine_enrichment ?? {});
    Object.assign(f.transcripts, local.transcripts ?? {});
    Object.assign(f.scripted, local.scripted ?? {});
  }
  return f;
}
