import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import demo from "../../fixtures/demo.json";
import type { Company, CopilotRecord, Deal, Feedback, LeadEngineRecord, Meeting, Segment, Store, StoredUpdate } from "./types";

// Supabase-opslag. Dezelfde tabellen als supabase/migrations/0001_init.sql.
// Enkel server-side gebruikt, met de service-role-sleutel.

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

async function check<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}

async function rows<T>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  return ((await check(p)) as T[] | null) ?? [];
}

export const supabaseStore: Store = {
  kind: "supabase",
  async listMeetings() {
    return rows<Meeting>(db().from("meetings").select("*").order("started_at", { ascending: false }));
  },
  async getMeeting(id) {
    return (await check(db().from("meetings").select("*").eq("id", id).maybeSingle())) as Meeting | null;
  },
  async linkMeeting(id, companyId, dealId) {
    await check(db().from("meetings").update({ company_id: companyId, deal_id: dealId }).eq("id", id));
  },
  async listCompanies() {
    return rows<Company>(db().from("companies").select("*").order("name"));
  },
  async getCompany(id) {
    return check(db().from("companies").select("*").eq("id", id).maybeSingle());
  },
  async listDeals(companyId) {
    return rows<Deal>(db().from("deals").select("*").eq("company_id", companyId));
  },
  async getLeadEngine(companyId) {
    return check(db().from("lead_engine").select("*").eq("company_id", companyId).maybeSingle());
  },
  async saveLeadEngine(rec) {
    await check(db().from("lead_engine").upsert(rec));
  },
  async listSegments(meetingId) {
    return rows<Segment>(db().from("meeting_segments").select("*").eq("meeting_id", meetingId).order("seq"));
  },
  async addSegment(seg) {
    await check(db().from("meeting_segments").upsert(seg));
  },
  async listUpdates(meetingId) {
    return rows<StoredUpdate>(db().from("copilot_updates").select("*").eq("meeting_id", meetingId).order("seq"));
  },
  async addUpdate(u) {
    await check(db().from("copilot_updates").upsert(u));
  },
  async getCopilot(meetingId) {
    const row = (await check(db().from("copilot").select("*").eq("meeting_id", meetingId).maybeSingle())) as CopilotRecord | null;
    return row ?? { meeting_id: meetingId, briefing: null, debrief: null };
  },
  async saveCopilot(rec) {
    await check(db().from("copilot").upsert(rec));
  },
  async addFeedback(f) {
    await check(db().from("copilot_feedback").insert(f));
  },
  async listFeedback(meetingId) {
    return rows<Feedback>(db().from("copilot_feedback").select("*").eq("meeting_id", meetingId));
  },
  async resetMeeting(meetingId) {
    for (const table of ["meeting_segments", "copilot_updates", "copilot", "copilot_feedback"]) {
      await check(db().from(table).delete().eq("meeting_id", meetingId));
    }
    const original = (demo.meetings as Meeting[]).find((m) => m.id === meetingId);
    if (original) {
      await check(db().from("meetings").upsert(original));
      if (original.company_id === null) {
        await check(db().from("lead_engine").upsert(demo.lead_engine as LeadEngineRecord[]));
      }
    }
  },
};
