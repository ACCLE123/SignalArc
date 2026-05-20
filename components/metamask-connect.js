"use client";

import { useMetaMask } from "@/components/metamask-context";

function shortenAddress(address) {
  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function MetaMaskConnect() {
  const { address, connect, error, hasMetaMask, isBalanceLoading, isConnected, isOnArc, status, usdcBalance } =
    useMetaMask();

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button type="button" onClick={connect} className="primary-button min-w-[12rem]">
        {status === "connecting" ? "Connecting..." : isConnected ? "MetaMask Connected" : "Connect MetaMask"}
      </button>

      <div className="text-right text-xs leading-6 text-[var(--muted)]">
        {isConnected ? (
          <>
            <p>{shortenAddress(address)}</p>
            <p>{isOnArc ? (isBalanceLoading ? "USDC balance loading..." : `${usdcBalance || "0"} USDC`) : "USDC unavailable"}</p>
          </>
        ) : hasMetaMask ? (
          <p>MetaMask detected</p>
        ) : (
          <p>MetaMask extension required</p>
        )}
        {isConnected ? <p>{isOnArc ? "Arc Testnet ready" : "Arc switch required"}</p> : null}
      </div>

      {error ? <p className="max-w-[18rem] text-right text-xs text-[var(--signal)]">{error}</p> : null}
    </div>
  );
}
