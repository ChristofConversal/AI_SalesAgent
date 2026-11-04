import fs from "node:fs";
import path from "node:path";
import demo from "../../fixtures/demo.json";
import type {
  Company,
  CopilotRecord,
  Deal,
  Feedback,
  LeadEngineRecord,
  Meeting,
  Segment,
  Store,
  StoredUpdate,
} from "./types";

// Lokale opslag in data/store.json, zodat de demo zonder Docker of Supabase draait.

type Db = {
  companies: Company[];
  deals: Deal[];
  meetings: Meeting[];
  lead_engine: LeadEngineRecord[];
  segments: Segment[];
  updates: StoredUpdate[];
  copilot: CopilotRecord[];
  feedback: Feedback[];
};

const FILE = path.join(process.cwd(), "data", "store.json");

export function seedDb(): Db {
  return {
    companies: demo.companies as Company[],
    deals: demo.deals as Deal[],
    meetings: demo.meetings as Meeting[],
    lead_engine: demo.lead_engine as LeadEngineRecord[],
    segments: [],
    updates: [],
    copilot: [],
    feedback: [],
  };
}

function load(): Db {
  if (!fs.existsSync(FILE)) {
    save(seedDb());
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8")) as Db;
}

function save(db: Db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function mutate(fn: (db: Db) => void) {
  const db = load();
  fn(db);
  save(db);
}

export const fileStore: Store = {
  kind: "file",
  async listMeetings() {
    return [...load().meetings].sort((a, b) => b.started_at.localeCompare(a.started_at));
  },
  async getMeeting(id) {
    return load().meetings.find((m) => m.id === id) ?? null;
  },
  async linkMeeting(id, companyId, dealId) {
    mutate((db) => {
      const m = db.meetings.find((x) => x.id === id);
      if (m) {
        m.company_id = companyId;
        m.deal_id = dealId;
      }
    });
  },
  async listCompanies() {
    return load().companies;
  },
  async getCompany(id) {
    return load().companies.find((c) => c.id === id) ?? null;
  },
  async listDeals(companyId) {
    return load().deals.filter((d) => d.company_id === companyId);
  },
  async getLeadEngine(companyId) {
    return load().lead_engine.find((r) => r.company_id === companyId) ?? null;
  },
  async saveLeadEngine(rec) {
    mutate((db) => {
      db.lead_engine = [...db.lead_engine.filter((r) => r.company_id !== rec.company_id), rec];
    });
  },
  async listSegments(meetingId) {
    return load().segments.filter((s) => s.meeting_id === meetingId).sort((a, b) => a.seq - b.seq);
  },
  async addSegment(seg) {
    mutate((db) => {
      db.segments = [...db.segments.filter((s) => !(s.meeting_id === seg.meeting_id && s.seq === seg.seq)), seg];
    });
  },
  async listUpdates(meetingId) {
    return load().updates.filter((u) => u.meeting_id === meetingId).sort((a, b) => a.seq - b.seq);
  },
  async addUpdate(u) {
    mutate((db) => {
      db.updates = [...db.updates.filter((x) => !(x.meeting_id === u.meeting_id && x.seq === u.seq)), u];
    });
  },
  async getCopilot(meetingId) {
    return load().copilot.find((c) => c.meeting_id === meetingId) ?? { meeting_id: meetingId, briefing: null, debrief: null };
  },
  async saveCopilot(rec) {
    mutate((db) => {
      db.copilot = [...db.copilot.filter((c) => c.meeting_id !== rec.meeting_id), rec];
    });
  },
  async addFeedback(f) {
    mutate((db) => {
      db.feedback.push(f);
    });
  },
  async listFeedback(meetingId) {
    return load().feedback.filter((f) => f.meeting_id === meetingId);
  },
  async resetMeeting(meetingId) {
    const fresh = seedDb();
    mutate((db) => {
      db.segments = db.segments.filter((s) => s.meeting_id !== meetingId);
      db.updates = db.updates.filter((u) => u.meeting_id !== meetingId);
      db.copilot = db.copilot.filter((c) => c.meeting_id !== meetingId);
      db.feedback = db.feedback.filter((f) => f.meeting_id !== meetingId);
      const original = fresh.meetings.find((m) => m.id === meetingId);
      if (original) {
        db.meetings = db.meetings.map((m) => (m.id === meetingId ? original : m));
        if (original.company_id === null) {
          // De koppeling ongedaan maken zet ook de Lead Engine terug naar de start van de demo.
          db.lead_engine = fresh.lead_engine;
        }
      }
    });
  },
};
