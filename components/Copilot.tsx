"use client";

import { useEffect, useRef, useState } from "react";
import {
  COVERAGE_KEYS,
  COVERAGE_LABELS,
  PROJECT_INFO_KEYS,
  type Briefing,
  type Debrief,
  type LiveUpdate,
} from "@/lib/agent/schemas";
import { AGENTS, agentLabel, isAgentId, type AgentId } from "@/lib/agent/models";
import { act, fetchState, fmt, type MeetingState } from "./api";
import ScriptPanel from "./ScriptPanel";

type View = "briefing" | "live" | "debrief";
type Props = { state: MeetingState; setState: (s: MeetingState) => void };

const STYLE_COLOR: Record<string, string> = {
  rood: "var(--c-red)",
  geel: "var(--c-yellow)",
  groen: "var(--c-green)",
  blauw: "var(--c-blue)",
  onbekend: "var(--c-border)",
};

const SCENARIO: Record<string, string> = {
  A: "Commerciële groeimachine",
  B: "Slim operationsplatform",
  C: "Merk klaar voor de volgende fase",
  D: "Inzicht en sturing",
};

export default function Copilot({ state, setState }: Props) {
  const id = state.meeting.id;
  const [view, setView] = useState<View>(state.segments.length === 0 ? "briefing" : state.copilot.debrief ? "debrief" : "live");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pace, setPace] = useState(4);
  const playingRef = useRef(false);
  // Keuze in de keuzelijst "Agent"; onthouden in deze browser.
  const [agent, setAgent] = useState<AgentId>(state.defaultAgent);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("copilot.agent");
      if (isAgentId(saved)) setAgent(saved);
    } catch {}
  }, []);
  function chooseAgent(a: AgentId) {
    setAgent(a);
    try {
      localStorage.setItem("copilot.agent", a);
    } catch {}
  }

  const enriching = state.leadEngine?.status === "enriching";
  const linked = Boolean(state.company);
  const finished = state.totalSegments > 0 && state.segments.length >= state.totalSegments;

  // Tijdens de verrijking elke seconde de status ophalen.
  useEffect(() => {
    if (!enriching) return;
    const t = setInterval(async () => setState(await fetchState(id)), 1200);
    return () => clearInterval(t);
  }, [enriching, id, setState]);

  async function run(action: string, body: object = {}) {
    setBusy(action);
    setNotice(null);
    try {
      const r = await act(id, action, { agent, ...body });
      setState(r.state);
      if (r.notice) setNotice(r.notice);
      return r.state;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  // Live-simulatie: elk fragment speelt na `pace` seconden, zoals de recorder segmenten wegschrijft.
  useEffect(() => {
    playingRef.current = playing;
    if (!playing) return;
    let cancelled = false;
    (async () => {
      let s: MeetingState | null = state;
      while (!cancelled && playingRef.current && s && s.segments.length < s.totalSegments) {
        const before: number = s.segments.length;
        s = await run("segment");
        // Stop als het fragment niet verwerkt werd (geen antwoord van de agent).
        if (!s || s.segments.length === before || s.segments.length >= s.totalSegments) break;
        await new Promise((r) => setTimeout(r, pace * 1000));
      }
      if (!cancelled) setPlaying(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  async function reset() {
    setPlaying(false);
    await run("reset");
    setView("briefing");
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="subtabs">
          {(["briefing", "live", "debrief"] as View[]).map((v) => (
            <button key={v} className={`subtab ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
              {v === "briefing" ? "Briefing" : v === "live" ? "Live" : "Debrief"}
            </button>
          ))}
        </div>
        <div className="row small">
          <label className="agent-pick" title={AGENTS.find((a) => a.id === agent)?.hint}>
            <span className="label">Agent</span>
            <select value={agent} onChange={(e) => chooseAgent(e.target.value as AgentId)} disabled={playing}>
              {AGENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <span className="chip outline">Opslag: {state.storeKind === "supabase" ? "Supabase" : "lokaal bestand"}</span>
          <button className="btn ghost small" onClick={reset} disabled={busy !== null}>
            Demo opnieuw
          </button>
        </div>
      </div>

      {agent !== "scripted" && !state.hasApiKey && (
        <div className="notice">
          {agentLabel(agent)} gekozen, maar er staat geen ANTHROPIC_API_KEY in .env.local. De agent valt terug op het script.
        </div>
      )}
      {notice && <div className="notice">{notice}</div>}

      <LinkAndEnrich state={state} busy={busy} run={run} />

      {view === "briefing" && <BriefingView state={state} busy={busy} run={run} onStart={() => setView("live")} />}
      {view === "live" && (
        <LiveView
          state={state}
          busy={busy}
          run={run}
          playing={playing}
          setPlaying={setPlaying}
          pace={pace}
          setPace={setPace}
          finished={finished}
          linked={linked}
          onDebrief={() => setView("debrief")}
        />
      )}
      {view === "debrief" && <DebriefView state={state} busy={busy} run={run} />}
    </div>
  );
}

type RunFn = (action: string, body?: object) => Promise<MeetingState | null>;

function LinkAndEnrich({ state, busy, run }: { state: MeetingState; busy: string | null; run: RunFn }) {
  const le = state.leadEngine;
  if (!state.company) {
    const s = state.linkSuggestion;
    return (
      <div className="card warn row" style={{ justifyContent: "space-between" }}>
        <div className="stack-sm" style={{ gap: 2 }}>
          <strong>Deze meeting hangt nog nergens aan.</strong>
          {s ? (
            <span className="small">
              Voorstel op basis van de deelnemers: <strong>{s.company.name}</strong>
              {s.deal ? (
                <>
                  {" "}
                  en deal <strong>{s.deal.title}</strong>
                </>
              ) : null}
              . Zonder koppeling is er geen dossier.
            </span>
          ) : (
            <span className="small">Geen bedrijf gevonden op basis van titel of deelnemers. Koppel de meeting in Central.</span>
          )}
        </div>
        {s && (
          <div className="cta">
            <button className="btn" disabled={busy !== null} onClick={() => run("link", { companyId: s.company.id, dealId: s.deal?.id ?? null })}>
              {busy === "link" ? "Koppelen…" : "Koppelen"}
            </button>
            <button className="arrow-btn" aria-hidden tabIndex={-1} disabled={busy !== null}>
              →
            </button>
          </div>
        )}
      </div>
    );
  }
  if (le?.status === "enriching") {
    return (
      <div className="card accent row">
        <span className="spinner" />
        <span>
          <strong>Lead Engine verrijkt het dossier.</strong>{" "}
          <span className="small muted">KBO → NBB-cijfers → ICP-score → websitescan → Leadinfo → signalen</span>
        </span>
      </div>
    );
  }
  if (state.needsEnrichment) {
    return (
      <div className="card warn row" style={{ justifyContent: "space-between" }}>
        <span className="small">
          <strong>{state.company.name}</strong> staat in de Lead Engine, maar is niet verrijkt: geen cijfers of websitescan, ICP-zekerheid{" "}
          {le?.icp_confidence ?? "?"}.
        </span>
        <button className="btn tertiary" disabled={busy !== null} onClick={() => run("enrich")}>
          Verrijking starten
        </button>
      </div>
    );
  }
  if (le?.status === "enriched") {
    // Enkel tonen wat de verrijking effectief opleverde.
    const facts = [
      le.fte !== null && `${le.fte} VTE`,
      le.revenue_eur !== null && `omzet €${(le.revenue_eur / 1e6).toFixed(1)} mln`,
      le.icp_score !== null && `ICP ${le.icp_score}`,
      le.leadinfo && `Leadinfo: ${le.leadinfo.pages.length} pagina's bezocht`,
      le.web && `website: ${le.web.cms}`,
    ].filter(Boolean) as string[];
    const missing = le.revenue_eur === null || le.web === null;
    return (
      <div className="card accent small row">
        <strong>Dossier verrijkt.</strong>
        <span>{facts.join(" · ") || "Geen extra gegevens gevonden."}</span>
        {missing && <span className="muted">Geen NBB-cijfers of websitescan beschikbaar.</span>}
      </div>
    );
  }
  return null;
}

function BriefingView({ state, busy, run, onStart }: { state: MeetingState; busy: string | null; run: RunFn; onStart: () => void }) {
  const b = state.copilot.briefing;
  const blocked = !state.company || state.leadEngine?.status === "enriching";
  if (!b) {
    return (
      <div className="card stack" style={{ alignItems: "flex-start" }}>
        <div className="stack-sm">
          <h2>
            Briefing voor het <span style={{ color: "var(--c-green)" }}>adviesgesprek</span>
          </h2>
          <p className="muted">
            De agent bundelt wat Central, de Lead Engine en Leadinfo al weten. Wat in het dossier staat, hoef je niet meer te vragen.
          </p>
        </div>
        <div className="cta">
          <button className="btn" disabled={blocked || busy !== null} onClick={() => run("briefing")}>
            {busy === "briefing" ? "Briefing maken…" : "Briefing maken"}
          </button>
          <button className="arrow-btn" aria-hidden tabIndex={-1} disabled={blocked || busy !== null}>
            →
          </button>
        </div>
        {blocked && <span className="small muted">Koppel eerst de meeting en wacht op de verrijking.</span>}
      </div>
    );
  }
  return <BriefingCard b={b} source={agentLabel(b.model ?? b.source)} onStart={onStart} />;
}

function BriefingCard({ b, source, onStart }: { b: Briefing; source: string; onStart: () => void }) {
  return (
    <div className="live-grid">
      <div className="stack">
        <div className="card stack-sm">
          <div className="label">Klant</div>
          <p>{b.klant}</p>
        </div>
        <div className="card stack-sm">
          <div className="label">Kernvragen voor dit gesprek</div>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {b.kernvragen.map((q) => (
              <li key={q} style={{ margin: "6px 0", fontFamily: "var(--font-head)", fontWeight: 500 }}>
                {q}
              </li>
            ))}
          </ol>
        </div>
        <div className="card stack-sm">
          <div className="label">Binnenkomen met</div>
          <ul className="clean">
            {b.observaties.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
        <div className="row">
          <div className="cta">
            <button className="btn" onClick={onStart}>
              Naar de live-stand
            </button>
            <button className="arrow-btn" onClick={onStart} aria-label="Naar de live-stand">
              →
            </button>
          </div>
          <span className="small muted">Gemaakt door: {source}</span>
        </div>
      </div>
      <div className="stack">
        <div className="card stack-sm">
          <div className="label">Wat we al weten (niet meer vragen)</div>
          {b.bekend.map((k) => (
            <div key={k.feit} className="small">
              {k.feit} <span className="chip outline">{k.bron}</span>
            </div>
          ))}
        </div>
        <div className="card stack-sm">
          <div className="label">Vermoedelijke route</div>
          <div className="row">
            <span className="chip">{b.route.primary}</span>
            <span className="chip outline">
              Scenario {b.route.scenario}: {SCENARIO[b.route.scenario]}
            </span>
          </div>
          <p className="small">{b.route.onderbouwing}</p>
          <div className="label" style={{ marginTop: 8 }}>
            Hypotheses
          </div>
          <ul className="clean small">
            {b.hypotheses.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
        {(b.gevoelig.length > 0 || b.praktisch.length > 0) && (
          <div className="card stack-sm">
            <div className="label">Let op</div>
            <ul className="clean small">
              {[...b.gevoelig, ...b.praktisch].map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveView(p: {
  state: MeetingState;
  busy: string | null;
  run: RunFn;
  playing: boolean;
  setPlaying: (v: boolean) => void;
  pace: number;
  setPace: (n: number) => void;
  finished: boolean;
  linked: boolean;
  onDebrief: () => void;
}) {
  const { state } = p;
  const last = state.updates.at(-1);
  const u: LiveUpdate | undefined = last?.payload;
  const handled = new Set(state.feedback.map((f) => f.suggestion_id));
  const lastSeg = state.segments.at(-1);
  const t = u?.t ?? 0;

  return (
    <div className="stack">
      <div className="card row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          {!p.finished ? (
            <>
              <button className="btn" disabled={!p.linked || (p.busy !== null && !p.playing)} onClick={() => p.setPlaying(!p.playing)}>
                {p.playing ? "Pauzeer" : state.segments.length === 0 ? "Start live-simulatie" : "Verder afspelen"}
              </button>
              <button className="btn ghost" disabled={!p.linked || p.playing || p.busy !== null} onClick={() => p.run("segment")}>
                Volgend fragment
              </button>
              <label className="small muted row" style={{ gap: 6 }}>
                Tempo
                <select value={p.pace} onChange={(e) => p.setPace(Number(e.target.value))}>
                  <option value={2}>snel (2 s)</option>
                  <option value={4}>normaal (4 s)</option>
                  <option value={8}>traag (8 s)</option>
                </select>
              </label>
            </>
          ) : (
            <div className="cta">
              <button className="btn" onClick={p.onDebrief}>
                Gesprek klaar: naar de debrief
              </button>
              <button className="arrow-btn" onClick={p.onDebrief} aria-label="Naar de debrief">
                →
              </button>
            </div>
          )}
          {p.busy === "segment" && (
            <span className="small muted">
              <span className="spinner" /> agent luistert…
            </span>
          )}
        </div>
        <span className="small muted">
          Fragment {state.segments.length} van {state.totalSegments}
          {last ? ` · minuut ${t} · ${agentLabel(last.model ?? last.source)}${last.source === "claude" ? `, ${(last.latency_ms / 1000).toFixed(1)} s` : ""}` : ""}
        </span>
      </div>

      {!p.linked && <div className="notice">Koppel eerst de meeting: zonder dossier kan de agent niet meeluisteren.</div>}

      <div className="live-grid">
        <div className="stack">
          {u?.phase.advice && <div className="notice">{u.phase.advice}</div>}
          {!u && <div className="card muted">Start de simulatie. Elk fragment komt binnen zoals de recorder van Central het wegschrijft.</div>}
          {u?.suggestions
            .filter((s) => !handled.has(s.id))
            .map((s) => (
              <div key={s.id} className={`suggestion ${s.priority}`}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className={`chip ${s.priority === "kritiek" ? "red" : s.priority === "hoog" ? "orange" : "outline"}`}>
                    {s.priority} · {s.type.replace("_", " ")}
                  </span>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn tertiary small" onClick={() => p.run("feedback", { suggestion_id: s.id, action: "gesteld" })}>
                      Gesteld
                    </button>
                    <button className="btn ghost small" onClick={() => p.run("feedback", { suggestion_id: s.id, action: "niet_relevant" })}>
                      Niet relevant
                    </button>
                  </div>
                </div>
                <div className="text">{s.text}</div>
                <div className="small muted">{s.reason}</div>
                {s.evidence && <div className="quote">“{s.evidence}”</div>}
              </div>
            ))}
          {u && u.suggestions.every((s) => handled.has(s.id)) && <div className="card muted small">Geen open suggesties. Luister verder.</div>}

          <ScriptPanel updates={state.updates.map((x) => x.payload)} />
        </div>

        <div className="stack">
          {lastSeg && (
            <div className="card stack-sm">
              <div className="label">Laatste fragment · {fmt(lastSeg.start_ms)}</div>
              {lastSeg.utterances.map((x, i) => (
                <div key={i} className={`transcript-line ${x.channel === "mic" ? "admin" : ""}`}>
                  <div className="who">{x.speaker}</div>
                  <div>{x.text}</div>
                </div>
              ))}
            </div>
          )}
          <TalkRatio state={state} />
          {u && <CoverageCard u={u} t={t} />}
          {u && u.opportunities.length > 0 && (
            <div className="card stack-sm">
              <div className="label">Kansen</div>
              {u.opportunities.map((o) => (
                <div key={o.hypothesis} className="stack-sm" style={{ gap: 4 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="chip">
                      {o.scenario} · {SCENARIO[o.scenario]}
                    </span>
                    <span className="chip outline">{o.strength}</span>
                  </div>
                  <div className="small">{o.hypothesis}</div>
                  <div className="quote">“{o.quote}”</div>
                </div>
              ))}
            </div>
          )}
          {u && u.people.length > 0 && (
            <div className="card stack-sm">
              <div className="label">Gesprekspartners (intern)</div>
              {u.people.map((x) => (
                <div key={x.name} className="stack-sm" style={{ gap: 2 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="dot" style={{ background: STYLE_COLOR[x.style] }} />
                    <strong className="small">{x.name}</strong>
                    <span className="small muted">
                      {x.role} · {x.decision_role}
                    </span>
                  </div>
                  {x.style !== "onbekend" && (
                    <div className="small muted">
                      {x.style}, zekerheid {x.confidence}
                      {x.tip ? ` · ${x.tip}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TalkRatio({ state }: { state: MeetingState }) {
  const { client_pct } = state.talk;
  const empty = state.segments.length === 0;
  const low = !empty && client_pct < 60;
  return (
    <div className="card stack-sm">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="label">Spreektijd klant</span>
        <strong className="small" style={{ color: low ? "var(--c-red)" : undefined }}>{empty ? "–" : `${client_pct}%`}</strong>
      </div>
      <div className="meter">
        <span style={{ width: `${empty ? 0 : client_pct}%` }} />
      </div>
      <span className="small muted">{low ? "Onder 60%: laat de klant meer aan het woord. Norm 70–80%." : "Norm in de analyse: klant 70–80%."}</span>
    </div>
  );
}

function CoverageCard({ u, t }: { u: LiveUpdate; t: number }) {
  const projectInfo = new Set<string>(PROJECT_INFO_KEYS);
  const late = t >= 45;
  const row = (k: (typeof COVERAGE_KEYS)[number]) => {
    const v = u.coverage[k];
    const missing = late && projectInfo.has(k) && v === "leeg";
    return [
      <span key={`${k}-l`}>{COVERAGE_LABELS[k]}</span>,
      <span key={`${k}-v`} className={`cov ${missing ? "missing" : v}`}>
        {missing ? "ontbreekt" : v}
      </span>,
    ];
  };
  return (
    <div className="card stack-sm">
      <div className="label">Projectinfo</div>
      <div className="coverage">{PROJECT_INFO_KEYS.flatMap(row)}</div>
      <div className="label" style={{ marginTop: 8 }}>
        Salesfiche
      </div>
      <div className="coverage">{COVERAGE_KEYS.filter((k) => !projectInfo.has(k)).flatMap(row)}</div>
    </div>
  );
}

function DebriefView({ state, busy, run }: { state: MeetingState; busy: string | null; run: RunFn }) {
  const d = state.copilot.debrief;
  if (state.segments.length === 0) return <div className="card muted">De debrief komt na het gesprek. Speel eerst de live-simulatie af.</div>;
  if (!d) {
    return (
      <div className="card stack" style={{ alignItems: "flex-start" }}>
        <h2>
          Salesfiche en <span style={{ color: "var(--c-green)" }}>pitchinput</span>
        </h2>
        <p className="muted">De agent leest het volledige transcript en vult de salesfiche, de spanningszin, het scenario en de next steps.</p>
        <div className="cta">
          <button className="btn" disabled={busy !== null} onClick={() => run("debrief")}>
            {busy === "debrief" ? "Debrief maken…" : "Debrief maken"}
          </button>
          <button className="arrow-btn" aria-hidden tabIndex={-1} disabled={busy !== null}>
            →
          </button>
        </div>
      </div>
    );
  }
  return <DebriefCard d={d} source={agentLabel(d.model ?? d.source)} />;
}

function DebriefCard({ d, source }: { d: Debrief; source: string }) {
  return (
    <div className="stack">
      <div className="card accent stack-sm">
        <div className="label">Spanningszin (kies er één voor slide 1)</div>
        {d.spanningszinnen.map((s) => (
          <div key={s} style={{ fontFamily: "var(--font-head)", fontWeight: 500, fontSize: 18 }}>
            {s}
          </div>
        ))}
      </div>
      <div className="live-grid">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Onderdeel</th>
                <th>Wat we hoorden</th>
                <th>Dekking</th>
              </tr>
            </thead>
            <tbody>
              {d.salesfiche.map((r) => (
                <tr key={r.onderdeel}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.onderdeel}</td>
                  <td>
                    {r.inhoud}
                    {r.ophalen && <div className="small muted">Ophalen: “{r.ophalen}”</div>}
                  </td>
                  <td>
                    <span className={`cov ${r.dekking}`}>{r.dekking}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stack">
          <div className="card stack-sm">
            <div className="label">Scenario voor slide 10</div>
            <span className="chip">
              {d.scenario.code} · {SCENARIO[d.scenario.code]}
            </span>
            {d.scenario.citaten.map((c) => (
              <div key={c} className="quote">
                “{c}”
              </div>
            ))}
            <p className="small">
              <strong>Strategie beslist nog:</strong> {d.scenario.te_beslissen}
            </p>
            <p className="small">
              <strong>Pitchversie {d.pitchversie.versie}.</strong> {d.pitchversie.motivatie}
            </p>
          </div>
          <List title="Doelstellingen (slide 2)" items={d.doelstellingen} />
          <List title="Sterktes (slide 3)" items={d.sterktes} />
          <List title="Zo werkt het vandaag (slide 4)" items={d.huidige_werking} />
          <List title="Open vragen voor de strategie (slide 6)" items={d.open_vragen} />
          <div className="card stack-sm">
            <div className="label">Next steps</div>
            {d.next_steps.map((n) => (
              <div key={n.wat} className="small">
                <strong>{n.wie}:</strong> {n.wat} <span className="muted">({n.wanneer})</span>
              </div>
            ))}
          </div>
          <List title="Coaching (enkel voor de admin)" items={d.coaching} />
          <span className="small muted">Gemaakt door: {source}</span>
        </div>
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="card stack-sm">
      <div className="label">{title}</div>
      <ul className="clean small">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
