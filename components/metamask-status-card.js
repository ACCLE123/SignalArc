"use client";

import { useMetaMask } from "@/components/metamask-context";

function shortenAddress(address) {
  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function MetaMaskStatusCard() {
  const { address, connect, error, hasMetaMask, isBalanceLoading, isConnected, isOnArc, status, usdcBalance } =
    useMetaMask();

  return (
    <article className="market-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-label">MetaMask</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">Wallet Status</h3>
        </div>
        <span className={`status-chip ${isConnected && isOnArc ? "status-chip-live" : ""}`}>
          {isConnected && isOnArc ? "Ready" : "Pending"}
        </span>
      </div>

      <div className="space-y-3 text-sm text-[var(--muted)]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] px-4 py-3">
          <p className="section-label">Provider</p>
          <p className="mt-2 text-[var(--ink)]">{hasMetaMask ? "MetaMask detected" : "MetaMask not detected"}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] px-4 py-3">
          <p className="section-label">Address</p>
          <p className="mt-2 text-[var(--ink)]">{isConnected ? shortenAddress(address) : "Not connected"}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] px-4 py-3">
          <p className="section-label">Network</p>
          <p className="mt-2 text-[var(--ink)]">{isConnected ? (isOnArc ? "Arc Testnet" : "Wrong network") : "Connect first"}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-soft)] px-4 py-3">
          <p className="section-label">USDC balance</p>
          <p className="mt-2 text-[var(--ink)]">
            {isConnected ? (isOnArc ? (isBalanceLoading ? "Loading..." : `${usdcBalance || "0"} USDC`) : "Switch to Arc Testnet") : "Connect first"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={connect}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
      >
        {status === "connecting" ? "Connecting..." : isConnected ? "Reconnect MetaMask" : "Connect MetaMask"}
      </button>

      {error ? <p className="text-xs text-[var(--signal)]">{error}</p> : null}
    </article>
  );
}
