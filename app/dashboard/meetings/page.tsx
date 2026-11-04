import Link from "next/link";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { sales: "Sales call", general: "Algemeen", internal: "Intern", kickoff: "Kickoff" };
const STATUS: Record<string, string> = { planned: "Gepland", recording: "Bezig", ready: "Klaar" };

export default async function MeetingsPage() {
  const store = getStore();
  const meetings = await store.listMeetings();
  const companies = await store.listCompanies();

  return (
    <div className="stack">
      <div>
        <h1>Meetings</h1>
        <p className="muted">Opgenomen gesprekken met transcriptie en verslag.</p>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {meetings.map((m) => {
          const company = companies.find((c) => c.id === m.company_id);
          return (
            <Link key={m.id} href={`/dashboard/meetings/${m.id}`} className="list-meeting">
              <div>
                <div style={{ fontWeight: 600 }}>{m.title}</div>
                <div className="small muted">
                  {new Date(m.started_at).toLocaleString("nl-BE", { dateStyle: "medium", timeStyle: "short" })} · {m.duration_min} min
                  {company ? ` · ${company.name}` : " · niet gekoppeld"}
                </div>
              </div>
              <span className="chip outline">{KIND[m.kind]}</span>
              <span className={`chip ${m.status === "planned" ? "" : "outline"}`}>{STATUS[m.status]}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
