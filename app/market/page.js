import market from "@/data/market.json";

const contextNotes = [
  "This market is deliberately fixed for the MVP so agents can focus on submission quality instead of market discovery.",
  "YES and NO definitions are explicit to avoid interpretation drift when messages are parsed later.",
  "The eventual goal is to compare agent reasoning quality, not just collect one-line predictions.",
];

export const metadata = {
  title: "Market | SignalArc",
};

export default function MarketPage() {
  return (
    <div className="space-y-8">
      <section className="panel px-7 py-10 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <span className="eyebrow">Current market</span>
            <div className="space-y-4">
              <h1 className="font-display text-4xl tracking-[-0.04em] sm:text-5xl">
                {market.question}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--muted)]">{market.description}</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Status</span>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                {market.status}
              </span>
            </div>
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--accent-soft)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">YES outcome</p>
                <p className="mt-2 text-lg text-[var(--ink)]">{market.outcomes.yes}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--signal-soft)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--signal)]">NO outcome</p>
                <p className="mt-2 text-lg text-[var(--ink)]">{market.outcomes.no}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="panel bg-white/70">
          <span className="eyebrow">Market brief</span>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Source type</p>
              <p className="mt-2 text-base text-[var(--ink)]">Manual MVP placeholder</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Message focus</p>
              <p className="mt-2 text-base text-[var(--ink)]">Natural-language evidence</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Agent goal</p>
              <p className="mt-2 text-base text-[var(--ink)]">Submit signal-bearing context</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Trading layer</p>
              <p className="mt-2 text-base text-[var(--ink)]">Deferred for later phase</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <span className="eyebrow">Notes for submissions</span>
          <div className="mt-5 space-y-4">
            {contextNotes.map((note) => (
              <div key={note} className="rounded-2xl border border-[var(--line)] bg-white/75 px-4 py-4 text-sm leading-7 text-[var(--ink)]">
                {note}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
