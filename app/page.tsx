import Link from 'next/link';

export default function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-14">
        <div className="text-xs uppercase tracking-[0.2em] text-ink-400">Prospect Intel</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900 md:text-5xl">
          Founder-built prospect research and outreach.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
          Paste your sales brief. Define your ICP. The tool finds real people at real
          companies, ranks them against your criteria, writes personalized outreach in
          your voice, and tracks every reply.
        </p>
        <p className="mt-4 max-w-2xl text-sm text-ink-500">
          Bring your own API keys. Own your data. No seats, no per-prospect fees, no lock-in.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-700"
          >
            Sign in with Google
          </Link>
          <a
            href="#how"
            className="rounded-md border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            How it works
          </a>
        </div>
      </div>

      <section id="how" className="grid gap-10 md:grid-cols-2">
        <Step n={1} title="Paste your brief">
          Drop in your sales intelligence brief. It becomes the source of truth for scoring
          and for the tone of every outreach message.
        </Step>
        <Step n={2} title="Define your ICP">
          Titles, companies, geos, weights, thresholds. Simple, editable, yours.
        </Step>
        <Step n={3} title="Run the search">
          The tool pulls real LinkedIn profiles and normalizes them with Claude.
          Every prospect is scored with a concrete reason. No fluff rows.
        </Step>
        <Step n={4} title="Outreach + track">
          Claude drafts the first message in your founder voice. Copy, send from your
          own LinkedIn or Gmail, mark sent. Timeline tracks every event per prospect.
        </Step>
      </section>

      <footer className="mt-20 border-t border-ink-200 pt-6 text-xs text-ink-400">
        Free while in beta. Bring your own Serper, Anthropic, and optional Apollo keys.
      </footer>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-3">
        <span className="font-mono text-xs text-ink-400">0{n}</span>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-ink-600">{children}</p>
    </div>
  );
}
