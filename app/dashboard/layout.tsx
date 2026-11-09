import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/dashboard/meetings" className="brand">
          <span className="brand-mark" aria-hidden />
          Central
        </Link>
        <nav className="nav">
          <span>Dashboard</span>
          <span>Leads</span>
          <span>Deals</span>
          <Link href="/dashboard/meetings" className="active">
            Meetings
          </Link>
          <span>Projecten</span>
          <span>Offertes</span>
        </nav>
        <div className="sidebar-foot">Demo van de Sales Co-pilot. Draait lokaal; niets wordt naar Central of naar klanten gestuurd.</div>
      </aside>
      <main className="main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
