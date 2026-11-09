import { z } from "zod";

// Wat de agent teruggeeft. Dezelfde schema's valideren de vooraf geschreven
// antwoorden (scripted-modus) en de antwoorden van Claude.

export const PHASES = [
  "0_opening",
  "1_bedrijf",
  "2_ambitie",
  "3_klantreis",
  "4_operations",
  "5_data_ai",
  "6_merk",
  "7_beslissing",
  "8_afronden",
] as const;

export const PHASE_LABELS: Record<(typeof PHASES)[number], string> = {
  "0_opening": "Opening",
  "1_bedrijf": "Bedrijf",
  "2_ambitie": "Ambitie",
  "3_klantreis": "Klantreis",
  "4_operations": "Operations",
  "5_data_ai": "Data en AI",
  "6_merk": "Merk",
  "7_beslissing": "Beslissing",
  "8_afronden": "Afronden",
};

export const COVERAGE_KEYS = [
  "bedrijf",
  "ambitie",
  "marketing",
  "sales",
  "operations",
  "finance_data",
  "systemen",
  "ai_automation",
  "merk",
  "mensen",
  "urgentie",
  "budget",
  "beslissing",
  "deadline",
  "offertegegevens",
] as const;

export const COVERAGE_LABELS: Record<(typeof COVERAGE_KEYS)[number], string> = {
  bedrijf: "Bedrijf",
  ambitie: "Ambitie",
  marketing: "Marketing",
  sales: "Sales",
  operations: "Operations",
  finance_data: "Finance en data",
  systemen: "Systemen",
  ai_automation: "AI en automation",
  merk: "Merk",
  mensen: "Mensen",
  urgentie: "Urgentie",
  budget: "Budget",
  beslissing: "Beslissing",
  deadline: "Deadline",
  offertegegevens: "Offertegegevens",
};

// Projectinfo die vóór het einde van het gesprek gedekt moet zijn.
export const PROJECT_INFO_KEYS = ["beslissing", "budget", "deadline", "offertegegevens"] as const;

const Coverage = z.enum(["leeg", "dun", "gedekt"]);
const Route = z.enum(["strategie", "tech", "groei", "creative", "onbekend"]);
const Confidence = z.enum(["laag", "midden", "hoog"]);
const Style = z.enum(["rood", "geel", "groen", "blauw", "onbekend"]);

export const Suggestion = z.object({
  id: z.string().describe("Stabiel id, bv. s1, s2. Hergebruik het id als dezelfde suggestie blijft staan."),
  priority: z.enum(["kritiek", "hoog", "normaal"]),
  type: z.enum(["kernvraag", "doorvraag", "gemiste_kans", "check", "waarschuwing", "communicatie"]),
  text: z.string().describe("Een vraag of tip van hoogstens 20 woorden die de admin letterlijk kan gebruiken."),
  reason: z.string(),
  evidence: z.string().describe("Letterlijk citaat uit het transcript, of leeg."),
});

export const LiveUpdate = z.object({
  t: z.number().describe("Minuut van het einde van het laatste segment."),
  phase: z.object({
    current: z.enum(PHASES),
    timing: z.enum(["op_schema", "loopt_uit", "achter"]),
    advice: z.string().nullable(),
  }),
  route: z.object({ primary: Route, secondary: Route.nullable(), confidence: Confidence }),
  suggestions: z.array(Suggestion).max(3),
  coverage: z.object(Object.fromEntries(COVERAGE_KEYS.map((k) => [k, Coverage])) as Record<(typeof COVERAGE_KEYS)[number], typeof Coverage>),
  opportunities: z.array(
    z.object({
      scenario: z.enum(["A", "B", "C", "D"]),
      discipline: z.enum(["strategy", "creative", "build", "growth"]),
      hypothesis: z.string(),
      quote: z.string(),
      strength: z.enum(["zwak", "midden", "sterk"]),
    }),
  ),
  people: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      decision_role: z.enum(["beslisser", "beïnvloeder", "gebruiker", "onbekend"]),
      style: Style,
      confidence: Confidence,
      signals: z.string(),
      tip: z.string(),
    }),
  ),
  key_quotes: z.array(z.string()),
  state_notes: z.string().describe("Korte notities voor jezelf bij het volgende segment."),
  // Het script invullen. Enkel wat er in dit segment bijkwam; de app telt alles op.
  asked: z.array(z.string()).describe("Id's van scriptvragen die de admin in dit segment stelde."),
  answers: z
    .array(
      z.object({
        question_id: z.string().describe("Id uit het script, of het id van een ingevoegde vraag."),
        answer: z.string().describe("Het antwoord van de klant in hoogstens 25 woorden."),
        quote: z.string().describe("Letterlijk citaat dat het antwoord draagt."),
        quality: z.enum(["beantwoord", "dun"]),
      }),
    )
    .describe("Nieuwe of betere antwoorden in dit segment. Een later antwoord op hetzelfde id vervangt het vorige."),
  inserted: z
    .array(
      z.object({
        id: z.string().describe("Nieuw id: i1, i2, … Nooit een bestaand id hergebruiken."),
        step: z.enum(PHASES).describe("De stap waar dit hoort; mag een andere stap zijn dan de huidige."),
        after: z.string().nullable().describe("Id van de scriptvraag waarna dit komt, of null voor het einde van de stap."),
        kind: z.enum(["vraag", "notitie"]),
        text: z.string().describe("Vraag van hoogstens 20 woorden, of notitie van hoogstens 20 woorden."),
        reason: z.string(),
        quote: z.string(),
      }),
    )
    .describe("Doorvragen en notities die je in het script invoegt naar aanleiding van wat de klant zei."),
});
export type LiveUpdate = z.infer<typeof LiveUpdate>;

export type ScriptAnswer = LiveUpdate["answers"][number] & { t: number };
export type ScriptInsert = LiveUpdate["inserted"][number] & { t: number };

// Alle updates samen: wat is gesteld, wat is beantwoord, wat is ingevoegd.
export function mergeScript(updates: LiveUpdate[]) {
  const asked = new Set<string>();
  const answers: Record<string, ScriptAnswer> = {};
  const inserted: ScriptInsert[] = [];
  for (const u of updates) {
    for (const id of u.asked ?? []) asked.add(id);
    for (const a of u.answers ?? []) {
      answers[a.question_id] = { ...a, t: u.t };
      asked.add(a.question_id);
    }
    for (const i of u.inserted ?? []) {
      const at = inserted.findIndex((x) => x.id === i.id);
      if (at >= 0) inserted[at] = { ...i, t: u.t };
      else inserted.push({ ...i, t: u.t });
    }
  }
  return { asked, answers, inserted };
}

export const Briefing = z.object({
  klant: z.string().describe("De klant in hoogstens 3 zinnen."),
  bekend: z.array(z.object({ feit: z.string(), bron: z.string() })).describe("Wat we al weten en niet meer vragen."),
  observaties: z.array(z.string()).describe("1 à 2 eigen observaties om mee binnen te komen."),
  route: z.object({ primary: Route, scenario: z.enum(["A", "B", "C", "D"]), onderbouwing: z.string() }),
  hypotheses: z.array(z.string()),
  kernvragen: z.array(z.string()),
  gevoelig: z.array(z.string()),
  praktisch: z.array(z.string()),
});
export type Briefing = z.infer<typeof Briefing>;

export const Debrief = z.object({
  salesfiche: z.array(
    z.object({
      onderdeel: z.string(),
      inhoud: z.string(),
      dekking: Coverage,
      ophalen: z.string().nullable().describe("Vraag om het ontbrekende op te halen, of null."),
    }),
  ),
  spanningszinnen: z.array(z.string()),
  doelstellingen: z.array(z.string()),
  sterktes: z.array(z.string()),
  huidige_werking: z.array(z.string()),
  open_vragen: z.array(z.string()),
  scenario: z.object({ code: z.enum(["A", "B", "C", "D"]), citaten: z.array(z.string()), te_beslissen: z.string() }),
  pitchversie: z.object({ versie: z.enum(["1", "2"]), motivatie: z.string() }),
  next_steps: z.array(z.object({ wie: z.string(), wat: z.string(), wanneer: z.string() })),
  coaching: z.array(z.string()),
});
export type Debrief = z.infer<typeof Debrief>;
