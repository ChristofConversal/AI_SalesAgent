"use client";

import { useEffect, useState } from "react";
import { mergeScript, type LiveUpdate, type ScriptInsert } from "@/lib/agent/schemas";
import { SCRIPT, type ScriptStep } from "@/lib/agent/script";

// Het salesscript als hoofdpaneel van de live-stand. Volgt standaard de stap van het gesprek;
// de admin kan zelf een andere stap openen.

export default function ScriptPanel({ updates }: { updates: LiveUpdate[] }) {
  const current = updates.at(-1)?.phase.current ?? "0_opening";
  const lastT = updates.at(-1)?.t ?? -1;
  const [picked, setPicked] = useState<string | null>(null);
  const shown = picked ?? current;

  // Een nieuwe stap in het gesprek neemt het scherm over, tenzij de admin net zelf koos.
  useEffect(() => setPicked(null), [current]);

  const { asked, answers, inserted } = mergeScript(updates);
  const step = SCRIPT.find((s) => s.key === shown) ?? SCRIPT[0];

  return (
    <div className="card stack" style={{ gap: 14 }}>
      <div className="steps" role="tablist" aria-label="Stappen van het salesscript">
        {SCRIPT.map((s) => {
          const done = s.themes.filter((th) => answers[th.id]).length;
          const notes = inserted.filter((i) => i.step === s.key).length;
          return (
            <button
              key={s.key}
              className={`step ${s.key === shown ? "active" : ""} ${s.key === current ? "live" : ""}`}
              onClick={() => setPicked(s.key)}
              title={s.goal}
            >
              <span>{s.label}</span>
              <span className="step-meta">
                {done}/{s.themes.length}
                {notes > 0 && <span className="step-badge">+{notes}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h3>
            {step.label} <span className="small muted">· {step.minutes} min</span>
          </h3>
          <div className="small muted">{step.goal}</div>
        </div>
        {picked && picked !== current && (
          <button className="btn tertiary small" onClick={() => setPicked(null)}>
            Volg het gesprek
          </button>
        )}
      </div>

      <StepBody step={step} asked={asked} answers={answers} inserted={inserted} lastT={lastT} />
    </div>
  );
}

function StepBody({
  step,
  asked,
  answers,
  inserted,
  lastT,
}: {
  step: ScriptStep;
  asked: Set<string>;
  answers: ReturnType<typeof mergeScript>["answers"];
  inserted: ScriptInsert[];
  lastT: number;
}) {
  const here = inserted.filter((i) => i.step === step.key);
  const after = (id: string | null) => here.filter((i) => i.after === id || (id === null && !step.themes.some((th) => th.id === i.after)));

  return (
    <div className="stack-sm" style={{ gap: 4 }}>
      {step.themes.map((th) => (
        <div key={th.id}>
          <QuestionRow
            label={th.theme}
            text={th.question}
            core={th.core}
            followups={th.followups}
            status={answers[th.id] ? answers[th.id].quality : asked.has(th.id) ? "gesteld" : "open"}
            answer={answers[th.id]}
            fresh={answers[th.id]?.t === lastT}
          />
          {after(th.id).map((i) => (
            <InsertRow key={i.id} item={i} answer={answers[i.id]} fresh={i.t === lastT} />
          ))}
        </div>
      ))}
      {after(null).map((i) => (
        <InsertRow key={i.id} item={i} answer={answers[i.id]} fresh={i.t === lastT} />
      ))}
    </div>
  );
}

type Answer = ReturnType<typeof mergeScript>["answers"][string];
const STATUS_LABEL: Record<string, string> = { open: "open", gesteld: "gesteld", dun: "dun", beantwoord: "beantwoord" };

function QuestionRow(p: { label: string; text: string; core: boolean; followups: string[]; status: string; answer?: Answer; fresh: boolean }) {
  return (
    <div className={`qrow ${p.status}`}>
      <span className={`qdot ${p.status}`} aria-label={STATUS_LABEL[p.status]} title={STATUS_LABEL[p.status]} />
      <div className="stack-sm" style={{ gap: 4 }}>
        <div className="label">
          {p.label}
          {p.core && <span className="core">kernvraag</span>}
        </div>
        <div className="qtext">{p.text}</div>
        {p.followups.length > 0 && !p.answer && <div className="small muted">Doorvraag: {p.followups.join(" · ")}</div>}
        {p.answer && <AnswerBox a={p.answer} fresh={p.fresh} />}
      </div>
    </div>
  );
}

function InsertRow({ item, answer, fresh }: { item: ScriptInsert; answer?: Answer; fresh: boolean }) {
  return (
    <div className={`insert ${item.kind} ${fresh ? "fresh" : ""}`}>
      <span className={`chip ${item.kind === "vraag" ? "orange" : "blue"}`}>{item.kind === "vraag" ? "AI-doorvraag" : "Notitie"}</span>
      <div className="stack-sm" style={{ gap: 4 }}>
        <div className={item.kind === "vraag" ? "qtext" : "small"}>{item.text}</div>
        {item.quote && <div className="quote">“{item.quote}” · minuut {item.t}</div>}
        {answer && <AnswerBox a={answer} fresh={false} />}
      </div>
    </div>
  );
}

function AnswerBox({ a, fresh }: { a: Answer; fresh: boolean }) {
  return (
    <div className={`answer ${a.quality} ${fresh ? "fresh" : ""}`}>
      <div>{a.answer}</div>
      <div className="small muted">
        “{a.quote}” · minuut {a.t}
        {a.quality === "dun" ? " · nog dun, doorvragen" : ""}
      </div>
    </div>
  );
}
