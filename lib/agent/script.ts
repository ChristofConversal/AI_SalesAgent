import type { PHASES } from "./schemas";

// Het salesscript van het adviesgesprek (zie het document "Salesscript adviesgesprek").
// Elke stap heeft thema's; elk thema één vraag met doorvragen. De agent verwijst naar de id's.

export type ScriptTheme = { id: string; theme: string; question: string; core: boolean; followups: string[] };
export type ScriptStep = { key: (typeof PHASES)[number]; label: string; minutes: number; goal: string; themes: ScriptTheme[] };

const t = (id: string, theme: string, question: string, core: boolean, followups: string[] = []): ScriptTheme => ({ id, theme, question, core, followups });

export const SCRIPT: ScriptStep[] = [
  {
    key: "0_opening",
    label: "Opening",
    minutes: 5,
    goal: "Agenda en verwachting zetten, snel in de vragende positie.",
    themes: [
      t("op.smalltalk", "Small talk", "Kort en oprecht, aansluitend op iets concreets.", false),
      t("op.voorstellen", "Jezelf voorstellen", "Conversal in vier stappen: waarom, voor wie, hoe, wat.", false),
      t("op.doel", "Doel van het gesprek", "\"Vandaag willen we vooral luisteren. Ons advies brengen we in een tweede gesprek.\"", true),
      t("op.verloop", "Verloop en tijd", "\"Eerst een paar vragen, daarna kort wie wij zijn. Hebben we tot …?\"", false),
      t("op.openingsvraag", "Openingsvraag met eigen observatie", "\"Ik zag dat jullie X doen, kan je daar meer over vertellen?\"", false),
    ],
  },
  {
    key: "1_bedrijf",
    label: "Bedrijf",
    minutes: 8,
    goal: "Begrijpen wat ze verkopen, aan wie, en waarom klanten kiezen.",
    themes: [
      t("bed.aanbod", "Aanbod en klanten", "Vertel eens kort: wat doen jullie vandaag en voor wie?", true, ["Wie zijn de belangrijkste types klanten?"]),
      t("bed.marge", "Omzet en marge", "Waar komt het grootste deel van de omzet en de marge vandaan?", false, ["Welk deel is terugkerend?"]),
      t("bed.waarom", "Waarom klanten kiezen", "Als ik jullie klanten vraag waarom ze voor jullie kiezen, wat zeggen ze dan?", true, ["Kan je een concreet voorbeeld geven?"]),
      t("bed.concurrentie", "Concurrentie", "Wie zien jullie als belangrijkste concurrent of alternatief?", false, ["Waarop winnen jullie, waarop verliezen jullie?"]),
      t("bed.watloopt", "Wat goed loopt", "Wat loopt vandaag vlot, en wat frustreert?", false),
    ],
  },
  {
    key: "2_ambitie",
    label: "Ambitie",
    minutes: 10,
    goal: "Doelen in hun woorden en met hun cijfers.",
    themes: [
      t("amb.doelbeeld", "Doelbeeld", "Stel dat we hier over drie jaar terug zitten: wat moet er dan veranderd zijn?", true),
      t("amb.soort", "Soort groei", "Meer omzet, betere marge, efficiënter werken of een combinatie?", false, ["Bestaande klanten, nieuwe klanten, nieuwe markten of producten?"]),
      t("amb.cijfers", "Cijfers", "Zijn daar cijfers aan gekoppeld? Van X naar Y?", false, ["Tegen wanneer?"]),
      t("amb.groeipijn", "Groeipijn", "Als jullie morgen dubbel zoveel klanten hebben, waar kraakt het dan eerst?", true),
      t("amb.capaciteit", "Capaciteit", "Hebben jullie de capaciteit om die extra klanten te bedienen?", false),
    ],
  },
  {
    key: "3_klantreis",
    label: "Klantreis",
    minutes: 10,
    goal: "Van eerste contact tot klant, en waar kansen verloren gaan.",
    themes: [
      t("kr.eerste", "Eerste contact", "Neem een typische nieuwe klant: hoe kwam die binnen, en wat gebeurde er daarna?", true),
      t("kr.kanalen", "Kanalen", "Hoe worden jullie gevonden? Welke kanalen leveren het meest op?", false, ["Welke campagnes liepen al, en wat leverden ze op?"]),
      t("kr.website", "Rol van de website", "Welke rol speelt de website?", false),
      t("kr.opvolging", "Opvolging", "Waar komt een aanvraag terecht, wie volgt op en in welk systeem?", false, ["Hoe snel?"]),
      t("kr.leadtotklant", "Van lead tot klant", "Hoe gaat het van lead naar offerte naar klant, en hoe lang duurt dat?", false, ["Hoeveel aanvragen per maand, hoeveel worden klant?"]),
      t("kr.meetbaar", "Meetbaarheid", "Weten jullie welke marketing uiteindelijk omzet oplevert?", false),
      t("kr.verlies", "Verlies", "Waar verliezen jullie vandaag kansen?", true),
    ],
  },
  {
    key: "4_operations",
    label: "Operations",
    minutes: 8,
    goal: "Wat er intern gebeurt, manueel werk en systemen.",
    themes: [
      t("ops.proces", "Intern proces", "Als een prospect klant wordt, wat gebeurt er dan intern?", true, ["Beschrijf één proces, van aanvraag tot factuur."]),
      t("ops.manueel", "Manueel en dubbel werk", "Waar zit veel manueel werk, of wordt informatie overgetypt?", false, ["Hoeveel tijd per week?"]),
      t("ops.afhankelijk", "Afhankelijkheid", "Waar gaat informatie verloren, of hangt alles af van één persoon?", false),
      t("ops.systemen", "Systemen", "Met welke systemen beheren jullie dat? CRM, ERP, boekhouding, planning, website.", true),
      t("ops.koppelingen", "Koppelingen", "Praten die systemen met elkaar?", false),
      t("ops.behouden", "Behouden", "Wat willen jullie zeker behouden?", false),
    ],
  },
  {
    key: "5_data_ai",
    label: "Data en AI",
    minutes: 5,
    goal: "Zicht op cijfers en gebruik van AI.",
    themes: [
      t("data.cijfers", "Zicht op cijfers", "Hebben jullie snel genoeg zicht op de cijfers om te beslissen?", true),
      t("data.rapportering", "Rapportering", "Welke rapportering kost veel handwerk?", false),
      t("data.ai", "AI vandaag", "Gebruiken jullie AI vandaag? Losse tools of in processen?", false),
      t("data.repetitief", "Repetitief werk", "Welke repetitieve taak zouden jullie het liefst zien verdwijnen?", false),
    ],
  },
  {
    key: "6_merk",
    label: "Merk",
    minutes: 4,
    goal: "Klopt de uitstraling nog.",
    themes: [
      t("merk.uitstraling", "Uitstraling", "Past jullie uitstraling nog bij het bedrijf dat jullie zijn en willen worden?", true),
      t("merk.consistentie", "Consistentie", "Is het verhaal hetzelfde op de website, in sales en in marketing?", false),
      t("merk.doel", "Doel van een merkvraag", "Wat moet een nieuwe uitstraling opleveren: aanvragen, zichtbaarheid, talent?", false),
      t("merk.goedkeuring", "Goedkeuring", "Wie keurt creatief werk goed?", false),
    ],
  },
  {
    key: "7_beslissing",
    label: "Beslissing",
    minutes: 5,
    goal: "Urgentie, budget, beslissers, trekker.",
    themes: [
      t("bes.urgentie", "Urgentie", "Waarom is dit nu een onderwerp? Wat gebeurt er als er volgend jaar niets verandert?", true, ["Is er een vaste deadline, en waarom?"]),
      t("bes.pogingen", "Eerdere pogingen", "Wat hebben jullie al geprobeerd, en waarom werkte dat niet?", false),
      t("bes.draagvlak", "Draagvlak", "Wie binnen het bedrijf ziet deze problemen ook?", false),
      t("bes.trekker", "Trekker", "Wie kan dit intern trekken, en hoeveel tijd kan die vrijmaken?", true),
      t("bes.budget", "Budget", "Hoeveel investeren jullie per jaar in marketing en IT samen?", true, ["Welke ruimte is er om te investeren?"]),
      t("bes.beslissers", "Beslissing", "Wie beslist mee over een traject als dit, en wie gaat ermee werken?", true),
    ],
  },
  {
    key: "8_afronden",
    label: "Afronden",
    minutes: 5,
    goal: "Valideren en de volgende stap vastleggen.",
    themes: [
      t("af.nogiets", "Analyse afsluiten", "Is er nog iets dat ik moet weten?", true),
      t("af.samenvatten", "Samenvatten", "Mag ik kort samenvatten wat ik gehoord heb?", true),
      t("af.opportuniteit", "Opportuniteit en rem", "Waar ligt de grootste opportuniteit, en wat houdt jullie het meest tegen?", true),
      t("af.succes", "Succes", "Als we over een jaar samenwerken en het werkte: wat is er dan veranderd?", false),
      t("af.volgende", "Volgende stap", "Datum voor het tweede gesprek, mét de beslisser. Wat kunnen jullie vooraf bezorgen?", true),
    ],
  },
];

export const SCRIPT_IDS = SCRIPT.flatMap((s) => s.themes.map((th) => th.id));

// Compacte vorm voor in de prompt.
export function scriptText(): string {
  return SCRIPT.map(
    (s) =>
      `${s.key} ${s.label} (${s.minutes} min): ${s.goal}\n` +
      s.themes.map((th) => `  - ${th.id}${th.core ? " [kern]" : ""}: ${th.question}`).join("\n"),
  ).join("\n");
}
