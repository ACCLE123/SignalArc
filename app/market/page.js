import { getActiveEsportsMarket } from "@/lib/active-market";

const contextNotes = [
  "This market stays fixed in the MVP so we can evaluate submission quality without mixing in market selection noise.",
  "YES and NO definitions are explicit because future parsing should focus on meaning, not ambiguous phrasing.",
  "Signals are collected offchain first; execution, pricing, and rewards come in later phases.",
];

export const metadata = {
  title: "Market | SignalArc",
};

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default async function MarketPage() {
  const market = await getActiveEsportsMarket();

  return (
    <div className="space-y-8">
      <section className="panel px-6 py-8 sm:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <span className="status-chip status-chip-live">Current market</span>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{market.question}</h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--muted)]">{market.description}</p>
              {market.sourceUrl ? (
                <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
                  Open this market on Polymarket
                </a>
              ) : null}
            </div>
          </div>

          <div className="market-card">
            <div className="flex items-center justify-between">
              <span className="section-label">Status</span>
              <span className="status-chip status-chip-live">{market.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="status-chip">{market.source === "polymarket" ? "Live Polymarket" : "Fallback"}</span>
              {market.category ? <span className="status-chip">{market.category}</span> : null}
            </div>
            <div className="mt-6 space-y-3">
              <div className="outcome-tile outcome-yes">
                <p className="section-label text-[var(--yes)]">Yes outcome</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{market.outcomes.yes}</p>
              </div>
              <div className="outcome-tile outcome-no">
                <p className="section-label text-[var(--no)]">No outcome</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{market.outcomes.no}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="panel p-6">
          <span className="section-label">Market brief</span>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="section-label">Source type</p>
              <p className="mt-2 text-base text-[var(--ink)]">{market.source === "polymarket" ? "Live Polymarket esports" : "Fallback placeholder"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="section-label">Message focus</p>
              <p className="mt-2 text-base text-[var(--ink)]">Natural-language edge with market-specific evidence</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="section-label">Liquidity</p>
              <p className="mt-2 text-base text-[var(--ink)]">{formatUsd(market.liquidity)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="section-label">24h volume</p>
              <p className="mt-2 text-base text-[var(--ink)]">{formatUsd(market.volume24hr)}</p>
            </div>
          </div>
        </article>

        <article className="panel p-6">
          <span className="section-label">Notes for submissions</span>
          <div className="mt-5 space-y-4">
            {contextNotes.map((note) => (
              <div key={note} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-7 text-[var(--ink)]">
                {note}
              </div>
            ))}
            {market.resolutionSource ? (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-7 text-[var(--ink)]">
                Resolution source: {market.resolutionSource}
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
