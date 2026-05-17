"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ARC_TESTNET = {
  chainId: "0x4cef52",
  chainName: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

const ARC_USDC_ERC20 = {
  address: "0x3600000000000000000000000000000000000000",
  decimals: 6,
};

const MetaMaskContext = createContext(null);

function encodeBalanceOf(address) {
  return `0x70a08231000000000000000000000000${address.toLowerCase().replace(/^0x/, "")}`;
}

function formatTokenBalance(value, decimals) {
  const raw = typeof value === "bigint" ? value : BigInt(value || 0);
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;

  if (fraction === 0n) {
    return whole.toString();
  }

  const padded = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  const trimmed = padded.slice(0, 4);

  return trimmed ? `${whole.toString()}.${trimmed}` : whole.toString();
}

function isMetaMaskProvider(provider) {
  return Boolean(
    provider?.isMetaMask &&
      !provider?.isPhantom &&
      !provider?.isOkxWallet &&
      !provider?.isOKExWallet &&
      !provider?.isRabby &&
      !provider?.isCoinbaseWallet,
  );
}

function formatWalletError(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  const code = typeof error?.code !== "undefined" ? `code ${error.code}` : null;
  const message = error?.message || fallbackMessage;
  return code ? `${message} (${code})` : message;
}

function findMetaMaskFallback() {
  if (typeof window === "undefined") {
    return null;
  }

  const ethereum = window.ethereum;
  const providers = Array.isArray(ethereum?.providers) ? ethereum.providers : ethereum ? [ethereum] : [];
  return providers.find(isMetaMaskProvider) ?? null;
}

function announceListenerFactory(setProviderDetail) {
  return (event) => {
    const detail = event.detail;

    if (!detail?.provider || !detail?.info) {
      return;
    }

    const isMetaMaskRdns = typeof detail.info.rdns === "string" && detail.info.rdns.startsWith("io.metamask");
    const looksLikeMetaMask = isMetaMaskProvider(detail.provider);

    if (isMetaMaskRdns || looksLikeMetaMask) {
      setProviderDetail((current) => current ?? detail);
    }
  };
}

async function ensureArcNetwork(provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainId }],
    });
  } catch (error) {
    if (error?.code !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [ARC_TESTNET],
    });
  }
}

export function MetaMaskProvider({ children }) {
  const [providerDetail, setProviderDetail] = useState(null);
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState("");
  const [usdcBalance, setUsdcBalance] = useState("");
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const provider = providerDetail?.provider ?? null;
  const hasMetaMask = Boolean(provider);
  const isConnected = Boolean(address);
  const isOnArc = chainId?.toLowerCase() === ARC_TESTNET.chainId;

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleAnnounce = announceListenerFactory(setProviderDetail);

    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const fallback = findMetaMaskFallback();
    if (fallback) {
      setProviderDetail((current) =>
        current ?? {
          info: {
            name: "MetaMask",
            icon: "",
            rdns: "io.metamask.fallback",
            uuid: "metamask-fallback",
          },
          provider: fallback,
        },
      );
    }

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, []);

  useEffect(() => {
    if (!provider) {
      return undefined;
    }

    async function syncWallet() {
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        const currentChainId = await provider.request({ method: "eth_chainId" });

        setAddress(accounts?.[0] ?? "");
        setChainId(currentChainId ?? "");
      } catch (syncError) {
        setError(formatWalletError(syncError, "Failed to read MetaMask state."));
      }
    }

    function handleAccountsChanged(accounts) {
      setAddress(accounts?.[0] ?? "");
      setError("");
    }

    function handleChainChanged(nextChainId) {
      setChainId(nextChainId ?? "");
      setError("");
    }

    syncWallet();
    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [provider]);

  useEffect(() => {
    if (!provider || !address || !isOnArc) {
      setUsdcBalance("");
      setIsBalanceLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function syncUsdcBalance() {
      try {
        setIsBalanceLoading(true);

        const balanceHex = await provider.request({
          method: "eth_call",
          params: [
            {
              to: ARC_USDC_ERC20.address,
              data: encodeBalanceOf(address),
            },
            "latest",
          ],
        });

        if (cancelled) {
          return;
        }

        const parsed = BigInt(balanceHex || "0x0");
        setUsdcBalance(formatTokenBalance(parsed, ARC_USDC_ERC20.decimals));
      } catch (balanceError) {
        if (!cancelled) {
          setUsdcBalance("");
          setError(formatWalletError(balanceError, "Failed to read Arc USDC balance."));
        }
      } finally {
        if (!cancelled) {
          setIsBalanceLoading(false);
        }
      }
    }

    syncUsdcBalance();

    return () => {
      cancelled = true;
    };
  }, [address, isOnArc, provider]);

  const connect = useCallback(async () => {
    if (!provider) {
      window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setStatus("connecting");
      setError("");

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      await ensureArcNetwork(provider);
      const currentChainId = await provider.request({ method: "eth_chainId" });

      setAddress(accounts?.[0] ?? "");
      setChainId(currentChainId ?? "");
      setStatus("idle");
    } catch (connectError) {
      setStatus("error");
      setError(formatWalletError(connectError, "Failed to connect MetaMask."));
    }
  }, [provider]);

  const value = useMemo(
    () => ({
      address,
      chainId,
      connect,
      error,
      hasMetaMask,
      isBalanceLoading,
      isConnected,
      isOnArc,
      status,
      usdcBalance,
    }),
    [address, chainId, connect, error, hasMetaMask, isBalanceLoading, isConnected, isOnArc, status, usdcBalance],
  );

  return <MetaMaskContext.Provider value={value}>{children}</MetaMaskContext.Provider>;
}

export function useMetaMask() {
  const context = useContext(MetaMaskContext);

  if (!context) {
    throw new Error("useMetaMask must be used within MetaMaskProvider.");
  }

  return context;
}
