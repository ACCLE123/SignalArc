function roundNumber(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function getSidePrice(market, side) {
  return side === "YES" ? market?.prices?.yes : market?.prices?.no;
}

export function canExecuteTradeAtMarketPrice(market, side) {
  const price = getSidePrice(market, side);
  return Number.isFinite(price) && price > 0 && price < 1;
}

export async function executeMarketEntry({ market, side, shares }) {
  const entryPrice = getSidePrice(market, side);

  if (!Number.isFinite(entryPrice) || entryPrice <= 0 || entryPrice >= 1) {
    throw new Error(`Cannot open ${side} trade without a valid market price.`);
  }

  const amountUsdc = shares * entryPrice;

  return {
    execution_mode: "paper-with-live-adapter-placeholder",
    live_trade_enabled: false,
    order_status: "filled_at_reference_price",
    amount_usdc: roundNumber(amountUsdc, 2),
    entry_price: roundNumber(entryPrice, 4),
    shares: roundNumber(shares, 6),
    external_order_id: null,
    executed_at: new Date().toISOString(),
    note: "Live Polymarket entry adapter is not connected yet. This record preserves the interface and uses the current reference price.",
  };
}

export async function executeMarketExit({ market, side, shares, amountUsdc, reason }) {
  const exitPrice = getSidePrice(market, side);

  if (!Number.isFinite(exitPrice) || exitPrice < 0 || exitPrice > 1) {
    throw new Error(`Cannot close ${side} trade without a valid market price.`);
  }

  const grossValue = shares * exitPrice;
  const profitUsdc = grossValue - amountUsdc;

  return {
    execution_mode: "paper-with-live-adapter-placeholder",
    live_trade_enabled: false,
    order_status: "filled_at_reference_price",
    exit_price: roundNumber(exitPrice, 4),
    gross_value_usdc: roundNumber(grossValue, 6),
    profit_usdc: roundNumber(profitUsdc, 6),
    closed_at: new Date().toISOString(),
    external_order_id: null,
    exit_reason: reason,
    note: "Live Polymarket exit adapter is not connected yet. This record preserves the interface and uses the current reference price.",
  };
}
