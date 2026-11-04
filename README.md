# Sales Co-pilot – demo

Werkende demo van de Sales Co-pilot van Conversal: een extra tab op de meetingpagina van Central, naast Summary en Transcript. De agent bereidt een adviesgesprek voor, luistert live mee en maakt achteraf de salesfiche en de pitchinput.

Alle gegevens in deze repo zijn **fictief** (Lindeman Print, Bakkerij Moens, alle personen en het gesprek). Er staan geen klantgegevens of transcripties uit Central in.

## Wat je ziet

1. **Koppelen.** De meeting hangt nog nergens aan. De tab stelt een bedrijf en deal voor op basis van het e-maildomein van de deelnemers.
2. **Verrijken.** Het bedrijf staat in de Lead Engine, maar enkel met KBO-gegevens. Na de koppeling start de verrijking (gesimuleerd: NBB-cijfers, ICP-score, websitescan, Leadinfo-bezoeken, signalen).
3. **Briefing.** Klant in 3 zinnen, wat we al weten met bron, observaties om mee binnen te komen, route en scenario, kernvragen.
4. **Live.** Het gesprek speelt af in 14 fragmenten, zoals de recorder van Central segmenten wegschrijft. Per fragment geeft de agent hoogstens 3 suggesties, de fase, de dekking van de salesfiche, kansen (scenario A–D met citaat) en een communicatiestijl per gesprekspartner. Spreektijd komt uit de kanalen (mic = admin, systeem = klant). Na minuut 45 kleurt ontbrekende projectinfo rood.
5. **Debrief.** Salesfiche (16 onderdelen), spanningszinnen, scenario, pitchversie, next steps en coaching voor de admin.

## Starten

Node 20 of nieuwer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Zonder verdere instellingen draait alles lokaal:

- **Agent:** zonder `ANTHROPIC_API_KEY` speelt de agent vooraf geschreven antwoorden af (`fixtures/demo.json`). Met een sleutel draait hij op Claude (`claude-opus-5-5`; live op effort `low`, briefing `medium`, debrief `high`). Faalt een Claude-aanroep, dan toont de tab de fout en loopt de demo verder op het script.
- **Opslag:** zonder Supabase-instellingen gaat alles naar `data/store.json`. Wissen: `npm run reset` of de knop **Demo opnieuw**.

## Met Supabase (Docker)

Vereist Docker Desktop.

```bash
npx supabase start          # start Postgres, API en Studio in Docker en voert supabase/migrations uit
npx supabase status         # toont API URL en service_role key
```

Zet in `.env.local`:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key uit supabase status>
```

Vul de demodata en start opnieuw:

```bash
npm run db:seed
npm run dev
```

De app gebruikt de service-role-sleutel enkel server-side; RLS staat aan op alle tabellen.

## Structuur

| Pad | Inhoud |
| --- | --- |
| `app/dashboard/meetings/[id]` | Meetingpagina met de tabs Summary, Transcript en Sales Co-pilot |
| `components/Copilot.tsx` | De tab: koppelen, verrijken, briefing, live, debrief |
| `app/api/meetings/[id]/[action]` | `link`, `enrich`, `briefing`, `segment`, `debrief`, `feedback`, `reset` |
| `lib/agent/prompts.ts` | Instructies: salesstructuur, routes, scenario's, communicatiestijlen, grenzen |
| `lib/agent/schemas.ts` | Zod-schema's voor live-update, briefing en debrief (ook gebruikt als structured output) |
| `lib/agent/claude.ts` | Claude-aanroepen met structured output, prompt caching en fallbacks |
| `lib/dossier.ts` | Dossier, koppelvoorstel, verrijkingsregel, spreektijd |
| `lib/store/` | Opslag: lokaal bestand of Supabase, zelfde interface |
| `supabase/migrations/0001_init.sql` | Tabellen: companies, deals, meetings, lead_engine, meeting_segments, copilot, copilot_updates, copilot_feedback |
| `fixtures/demo.json` | Fictieve bedrijven, het gesprek en de vooraf geschreven antwoorden |

## Van demo naar Central

- `segment` vervangen door een worker die luistert op nieuwe rijen in `meeting_segments` van Central.
- Polling vervangen door het realtime-kanaal van Central.
- De gesimuleerde verrijking vervangen door de Lead Engine zodra die in Central zit.
- Diarisatie toevoegen voor fysieke gesprekken met één microfoon.

De volledige bouwspec staat in een apart document (Sales Co-pilot in Central – bouwspec).

## Niet getest

- De Claude-route met een echte API-sleutel (enkel de terugval bij een fout is getest).
- De Supabase-route (Docker stond niet op de ontwikkelmachine).
