import type { Briefing, Debrief, LiveUpdate } from "../agent/schemas";

export type Company = {
  id: string;
  name: string;
  vat: string | null;
  city: string | null;
  domain: string | null;
  sector: string | null;
  // Historiek uit Central (projecten, offertes), als korte zinnen.
  notes?: string[];
};

export type Deal = {
  id: string;
  company_id: string;
  title: string;
  stage: string;
  amount: number | null;
};

export type Participant = { name: string; role: string; side: "conversal" | "klant"; email?: string };

export type Meeting = {
  id: string;
  title: string;
  kind: "sales" | "general" | "internal" | "kickoff";
  capture: "mic" | "mic_system";
  started_at: string;
  duration_min: number;
  status: "planned" | "recording" | "ready";
  company_id: string | null;
  deal_id: string | null;
  participants: Participant[];
  summary: string | null;
};

// Wat de Lead Engine over een bedrijf weet. Status `identified` = enkel KBO-gegevens.
export type LeadEngineRecord = {
  company_id: string;
  status: "identified" | "enriching" | "enriched";
  icp_score: number | null;
  icp_confidence: number | null;
  fte: number | null;
  revenue_eur: number | null;
  gross_margin_eur: number | null;
  signals: { type: string; text: string; date: string }[];
  leadinfo: { first_visit: string; last_visit: string; pages: string[] } | null;
  web: { cms: string; pagespeed: number; keywords: number } | null;
  updated_at: string;
};

export type Segment = {
  meeting_id: string;
  seq: number;
  start_ms: number;
  end_ms: number;
  utterances: { channel: "mic" | "system"; speaker: string; text: string }[];
};

export type StoredUpdate = { meeting_id: string; seq: number; t: number; payload: LiveUpdate; source: "claude" | "scripted"; latency_ms: number; created_at: string };

export type CopilotRecord = {
  meeting_id: string;
  briefing: (Briefing & { source: "claude" | "scripted"; created_at: string }) | null;
  debrief: (Debrief & { source: "claude" | "scripted"; created_at: string }) | null;
};

export type Feedback = { meeting_id: string; suggestion_id: string; action: "gesteld" | "niet_relevant"; created_at: string };

export interface Store {
  kind: "file" | "supabase";
  listMeetings(): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | null>;
  linkMeeting(id: string, companyId: string, dealId: string | null): Promise<void>;
  listCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | null>;
  listDeals(companyId: string): Promise<Deal[]>;
  getLeadEngine(companyId: string): Promise<LeadEngineRecord | null>;
  saveLeadEngine(rec: LeadEngineRecord): Promise<void>;
  listSegments(meetingId: string): Promise<Segment[]>;
  addSegment(seg: Segment): Promise<void>;
  listUpdates(meetingId: string): Promise<StoredUpdate[]>;
  addUpdate(u: StoredUpdate): Promise<void>;
  getCopilot(meetingId: string): Promise<CopilotRecord>;
  saveCopilot(rec: CopilotRecord): Promise<void>;
  addFeedback(f: Feedback): Promise<void>;
  listFeedback(meetingId: string): Promise<Feedback[]>;
  resetMeeting(meetingId: string): Promise<void>;
}
