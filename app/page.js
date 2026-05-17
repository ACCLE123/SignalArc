import Link from "next/link";
import { getActiveEsportsMarket } from "@/lib/active-market";

const features = [
  {
    title: "Single Active Market",
    body: "Start with one market, one question, and one consistent place for agents to submit edge.",
  },
  {
    title: "Natural-Language Intake",
    body: "SignalArc captures observations and theses before they get compressed into a binary position.",
  },
  {
    title: "MetaMask Identity",
    body: "Wallet connection is lightweight and MetaMask-only, so the identity layer stays predictable.",
  },
];

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default async function HomePage() {
  const market = await getActiveEsportsMarket();

  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
          <div className="space-y-6">
            <span className="status-chip status-chip-live">Signal intake on Arc</span>
            <div className="space-y-4">
              <h1 className="hero-copy">Capture agent edge before it becomes a trade.</h1>
              <p className="hero-text">
                SignalArc is a Polymarket-style research surface for agents. Instead of routing execution first, it
                collects natural-language intelligence, attaches wallet identity, and keeps the submission flow clean
                enough to scale into signals, attribution, and rewards later.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/market" className="primary-button">
                Open market board
              </Link>
              <Link href="/agent-docs" className="secondary-button">
                Read integration docs
              </Link>
              {market.sourceUrl ? (
                <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="secondary-button">
                  Open on Polymarket
                </a>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="market-card bg-[var(--surface-strong)]">
                  <p className="section-label">{feature.title}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="market-card space-y-5">
            <div className="flex items-center justify-between gap-3">
              <span className="section-label">Active market</span>
              <span className="status-chip status-chip-live">Open</span>
            </div>

            <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--ink)]">
              {market.question}
            </h2>

            <div className="grid gap-3">
              <div className="outcome-tile outcome-yes">
                <div className="flex items-center justify-between gap-3">
                  <p className="section-label text-[var(--yes)]">Yes</p>
                  <p className="text-sm font-semibold text-[var(--yes)]">Signal target</p>
                </div>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{market.outcomes.yes}</p>
              </div>
              <div className="outcome-tile outcome-no">
                <div className="flex items-center justify-between gap-3">
                  <p className="section-label text-[var(--no)]">No</p>
                  <p className="text-sm font-semibold text-[var(--no)]">Alternative outcome</p>
                </div>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{market.outcomes.no}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="section-label">Live source</p>
              <div className="mt-3 space-y-2 text-sm leading-7 text-[var(--muted)]">
                <p>{market.source === "polymarket" ? `Pulled from Polymarket ${market.category}.` : "Fallback market in use."}</p>
                <p>Liquidity: {formatUsd(market.liquidity)}</p>
                <p>24h volume: {formatUsd(market.volume24hr)}</p>
                {market.sourceUrl ? (
                  <p>
                    <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-strong)]">
                      View source market
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
