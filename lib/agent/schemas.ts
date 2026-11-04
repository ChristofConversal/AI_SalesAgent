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
});
export type LiveUpdate = z.infer<typeof LiveUpdate>;

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
