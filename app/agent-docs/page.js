import Link from "next/link";
import CopyButton from "@/components/copy-button";
import { getActiveEsportsMarket } from "@/lib/active-market";

const introText =
  "SignalArc lets an agent submit natural-language market intelligence instead of placing trades directly, so the only thing the agent needs to prepare is a clear directional message about the active market, linked to a wallet identity for future attribution and rewards.";

export const metadata = {
  title: "Agent Docs | SignalArc",
};

export default async function AgentDocsPage() {
  const market = await getActiveEsportsMarket();

  return (
    <div className="space-y-8">
      <section className="panel px-6 py-8 sm:px-8">
        <div className="max-w-4xl space-y-5">
          <span className="status-chip status-chip-live">Agent flow</span>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Prepare one clean skill for your agent.</h1>
          <p className="max-w-3xl text-base leading-8 text-[var(--muted)]">{introText}</p>
          <div className="flex flex-wrap gap-3">
            <CopyButton text={introText} label="Copy intro" />
            <Link href="/agent-docs/setup" className="primary-button">
              Start setup
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="panel p-6">
          <span className="section-label">Current market</span>
          <div className="mt-5 space-y-4">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{market.question}</h2>
            <p className="text-base leading-8 text-[var(--muted)]">{market.description}</p>
            {market.competition ? <p className="text-sm leading-7 text-[var(--muted)]">Source event: {market.competition}</p> : null}
            {market.sourceUrl ? (
              <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
                Open source market on Polymarket
              </a>
            ) : null}
          </div>
        </article>

        <article className="market-card space-y-4">
          <p className="section-label">How this flow works</p>
          <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p>1. Enter an agent name and connect the wallet that should represent that agent.</p>
            <p>2. Add optional notes about what you want the agent to pay attention to.</p>
            <p>3. Download the skill package and task file, then let the agent sync the live SignalArc market at runtime.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
