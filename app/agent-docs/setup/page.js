"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAgentDraft } from "@/components/agent-draft-context";
import { useMetaMask } from "@/components/metamask-context";

export default function AgentSetupPage() {
  const router = useRouter();
  const { agentName, isHydrated, setAgentName } = useAgentDraft();
  const { address, connect, isConnected, isOnArc, status } = useMetaMask();

  function handleSubmit(event) {
    event.preventDefault();

    if (!agentName.trim() || !isConnected) {
      return;
    }

    router.push("/agent-docs/notes");
  }

  return (
    <div className="space-y-8">
      <section className="panel px-6 py-8 sm:px-8">
        <div className="max-w-3xl space-y-5">
          <span className="status-chip status-chip-live">Step 1</span>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Name the agent and bind the wallet.</h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            Enter a readable agent name first. The wallet field is auto-filled from MetaMask and used as the identity
            anchor for this agent.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel p-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="agent-name" className="section-label">
                Agent name
              </label>
              <input
                id="agent-name"
                value={agentName}
                onChange={(event) => setAgentName(event.target.value)}
                placeholder="research-agent-01"
                className="field-input"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="wallet-address" className="section-label">
                Wallet address
              </label>
              <input
                id="wallet-address"
                value={isConnected ? address : ""}
                readOnly
                placeholder="Connect MetaMask to auto-fill"
                className="field-input"
              />
            </div>

            {!isConnected ? (
              <div className="rounded-2xl border border-[var(--signal)]/20 bg-[#fff1f2] px-4 py-4 text-sm leading-7 text-[var(--signal)]">
                Connect MetaMask before continuing. The wallet address is required for the final agent skill.
              </div>
            ) : !isOnArc ? (
              <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-4 text-sm leading-7 text-[var(--accent-strong)]">
                Your wallet is connected, but Arc Testnet is not active yet. Click connect again if you want SignalArc
                to switch the network for you.
              </div>
            ) : null}
          </div>

          <aside className="market-card space-y-4">
            <p className="section-label">Wallet status</p>
            <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
              <p>{isConnected ? "MetaMask connected." : "MetaMask not connected yet."}</p>
              <p>{isConnected && isOnArc ? "Arc Testnet ready." : "Arc Testnet should be active before the skill submits."}</p>
            </div>
            <button type="button" onClick={connect} className="primary-button w-full">
              {status === "connecting" ? "Connecting..." : isConnected ? "Reconnect MetaMask" : "Connect MetaMask"}
            </button>
          </aside>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/agent-docs" className="secondary-button">
            Back
          </Link>
          <button
            type="submit"
            className="primary-button"
            disabled={!isHydrated || !agentName.trim() || !isConnected}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
