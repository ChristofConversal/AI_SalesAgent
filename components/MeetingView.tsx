"use client";

import Link from "next/link";
import { useState } from "react";
import { fmt, type MeetingState } from "./api";
import Copilot from "./Copilot";

const KIND: Record<string, string> = { sales: "Sales call", general: "Algemeen", internal: "Intern", kickoff: "Kickoff" };

export default function MeetingView({ initial }: { initial: MeetingState }) {
  const [state, setState] = useState(initial);
  const isSales = state.meeting.kind === "sales";
  const [tab, setTab] = useState<"summary" | "transcript" | "copilot">(isSales ? "copilot" : "summary");
  const { meeting, company, deals } = state;
  const deal = deals.find((d) => d.id === meeting.deal_id);

  return (
    <div>
      <div className="small muted" style={{ marginBottom: 8 }}>
        <Link href="/dashboard/meetings">Meetings</Link> / {meeting.title}
      </div>
      <div className="meeting-head">
        <div className="stack-sm">
          <h1>{meeting.title}</h1>
          <div className="row small muted">
            <span>{new Date(meeting.started_at).toLocaleString("nl-BE", { dateStyle: "full", timeStyle: "short" })}</span>
            <span>·</span>
            <span>{meeting.duration_min} min</span>
            <span className="chip outline">{KIND[meeting.kind]}</span>
            <span className="chip outline">{meeting.capture === "mic_system" ? "Online call (mic + systeem)" : "Eén microfoon"}</span>
          </div>
        </div>
        <div className="row">
          {company ? <span className="chip">Bedrijf: {company.name}</span> : <span className="chip orange">Niet gekoppeld</span>}
          {deal && <span className="chip">Deal: {deal.title}</span>}
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button className={`tab ${tab === "summary" ? "active" : ""}`} onClick={() => setTab("summary")}>
          Summary
        </button>
        <button className={`tab ${tab === "transcript" ? "active" : ""}`} onClick={() => setTab("transcript")}>
          Transcript
        </button>
        {isSales && (
          <button className={`tab ${tab === "copilot" ? "active" : ""}`} onClick={() => setTab("copilot")}>
            Sales Co-pilot<span className="new">nieuw</span>
          </button>
        )}
      </div>

      {tab === "summary" && <Summary state={state} />}
      {tab === "transcript" && <Transcript state={state} />}
      {tab === "copilot" && <Copilot state={state} setState={setState} />}
    </div>
  );
}

function Summary({ state }: { state: MeetingState }) {
  const d = state.copilot.debrief;
  if (state.meeting.summary) return <div className="card">{state.meeting.summary}</div>;
  if (d) {
    return (
      <div className="card stack-sm">
        <h3>Verslag</h3>
        <ul className="clean">
          {d.salesfiche.slice(0, 6).map((r) => (
            <li key={r.onderdeel}>
              <strong>{r.onderdeel}:</strong> {r.inhoud}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <div className="card muted">Nog geen verslag. Het verslag verschijnt na de opname.</div>;
}

function Transcript({ state }: { state: MeetingState }) {
  if (state.segments.length === 0) return <div className="card muted">Nog geen transcriptie.</div>;
  return (
    <div className="card">
      {state.segments.flatMap((s) =>
        s.utterances.map((u, i) => (
          <div key={`${s.seq}-${i}`} className={`transcript-line ${u.channel === "mic" ? "admin" : ""}`}>
            <div className="who">
              {u.speaker}
              <div className="label">{i === 0 ? fmt(s.start_ms) : ""}</div>
            </div>
            <div>{u.text}</div>
          </div>
        )),
      )}
    </div>
  );
}
