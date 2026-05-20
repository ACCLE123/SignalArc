import { getMarketSnapshotById } from "@/lib/active-market";
import { readMessages } from "@/lib/messages-store";
import { EXIT_HIGH_PRICE, EXIT_LOW_PRICE, MIN_RECORDS_TO_TRADE, TRADE_SIZE_SHARES, USER_PROFIT_SHARE } from "@/lib/trading-config";
import { insertTrade, readTrades, updateTrade } from "@/lib/trades-store";
import { canExecuteTradeAtMarketPrice, executeMarketEntry, executeMarketExit } from "@/lib/trading-adapter";

function roundNumber(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function normalizeId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isParsedSignal(message) {
  const parse = message?.signal_parse;

  return (
    parse?.parse_status === "parsed" &&
    Number.isFinite(Number(parse?.yes_confidence)) &&
    Number.isFinite(Number(parse?.no_confidence))
  );
}

function matchesTradeScope(message, { marketId, eventId }) {
  const messageMarketId = normalizeId(message?.market_id);
  const messageEventId = normalizeId(message?.event_id);

  if (eventId && messageEventId) {
    return messageEventId === eventId;
  }

  return messageMarketId === marketId;
}

function getEligibleMessages(messages, scope) {
  return messages.filter((message) => matchesTradeScope(message, scope) && isParsedSignal(message));
}

function aggregateScores(messages) {
  return messages.reduce(
    (accumulator, message) => {
      accumulator.yesScore += Number(message.signal_parse.yes_confidence);
      accumulator.noScore += Number(message.signal_parse.no_confidence);
      return accumulator;
    },
    {
      yesScore: 0,
      noScore: 0,
    },
  );
}

function buildParticipants(messages, side) {
  const participants = new Map();

  for (const message of messages) {
    const contribution = side === "YES" ? Number(message.signal_parse.yes_confidence) : Number(message.signal_parse.no_confidence);
    const participantKey = normalizeId(message.wallet_address) || message.id;
    const current = participants.get(participantKey) || {
      wallet_address: message.wallet_address,
      agent_name: message.agent_name,
      message_ids: [],
      contribution_score: 0,
      reward_amount_usdc: 0,
    };

    current.message_ids.push(message.id);
    current.contribution_score = roundNumber(current.contribution_score + contribution);
    participants.set(participantKey, current);
  }

  return Array.from(participants.values()).sort((left, right) => right.contribution_score - left.contribution_score);
}

function pickTradeSide({ yesScore, noScore }) {
  if (yesScore > noScore) {
    return "YES";
  }

  if (noScore > yesScore) {
    return "NO";
  }

  return null;
}

function getCurrentSidePrice(market, side) {
  return side === "YES" ? market?.prices?.yes : market?.prices?.no;
}

function shouldCloseTrade(trade, market) {
  const currentPrice = getCurrentSidePrice(market, trade.side);

  if (Number.isFinite(currentPrice) && currentPrice >= EXIT_HIGH_PRICE) {
    return {
      shouldClose: true,
      reason: "target_hit_0.99",
    };
  }

  if (Number.isFinite(currentPrice) && currentPrice <= EXIT_LOW_PRICE) {
    return {
      shouldClose: true,
      reason: "target_hit_0.01",
    };
  }

  return {
    shouldClose: false,
    reason: null,
  };
}

function withRewardSplit(trade) {
  if (!trade || !Array.isArray(trade.participants)) {
    return trade;
  }

  if (!Number.isFinite(Number(trade.profit_usdc)) || Number(trade.profit_usdc) <= 0) {
    return {
      ...trade,
      reward_pool_usdc: 0,
      platform_pool_usdc: 0,
      participants: trade.participants.map((participant) => ({
        ...participant,
        reward_amount_usdc: 0,
      })),
    };
  }

  const rewardPool = roundNumber(Number(trade.profit_usdc) * USER_PROFIT_SHARE);
  const platformPool = roundNumber(Number(trade.profit_usdc) - rewardPool);
  const totalContribution = trade.participants.reduce((sum, participant) => sum + Number(participant.contribution_score), 0);

  return {
    ...trade,
    reward_pool_usdc: rewardPool,
    platform_pool_usdc: platformPool,
    participants: trade.participants.map((participant) => ({
      ...participant,
      reward_amount_usdc:
        totalContribution > 0 ? roundNumber((rewardPool * Number(participant.contribution_score)) / totalContribution) : 0,
    })),
  };
}

function findTradeForScope(trades, { marketId, eventId }) {
  return trades.find((trade) => {
    const sameEvent = eventId && normalizeId(trade.event_id) && normalizeId(trade.event_id) === eventId;
    const sameMarket = normalizeId(trade.market_id) === marketId;
    return sameEvent || sameMarket;
  });
}

function buildTradeSummary({ market, trade, messages }) {
  const validRecords = messages.length;
  const { yesScore, noScore } = aggregateScores(messages);
  const remainingRecords = Math.max(MIN_RECORDS_TO_TRADE - validRecords, 0);
  const tradeStatus = trade
    ? trade.status === "settled"
      ? "Settled"
      : "Traded"
    : validRecords >= MIN_RECORDS_TO_TRADE
      ? "Ready"
      : "Collecting";

  return {
    market_id: market.marketId,
    event_id: market.eventId || market.marketId,
    has_traded: Boolean(trade),
    trade_status: tradeStatus,
    valid_records: validRecords,
    required_records: MIN_RECORDS_TO_TRADE,
    remaining_records: remainingRecords,
    yes_score: roundNumber(yesScore),
    no_score: roundNumber(noScore),
    decision_side: trade?.side || pickTradeSide({ yesScore, noScore }),
    trade_size_shares: TRADE_SIZE_SHARES,
    amount_usdc: trade?.amount_usdc ?? null,
    entry_price: trade?.entry_price ?? null,
    exit_price: trade?.exit_price ?? null,
    profit_usdc: trade?.profit_usdc ?? null,
    reward_pool_usdc: trade?.reward_pool_usdc ?? null,
    traded_at: trade?.opened_at ?? null,
    closed_at: trade?.closed_at ?? null,
    participants: trade?.participants ?? [],
    execution_mode: trade?.execution_mode ?? "paper-with-live-adapter-placeholder",
  };
}

async function openTrade({ market, eligibleMessages, scope }) {
  const scores = aggregateScores(eligibleMessages);
  const side = pickTradeSide(scores);

  if (!side) {
    return null;
  }

  if (!canExecuteTradeAtMarketPrice(market, side)) {
    return null;
  }

  const execution = await executeMarketEntry({
    market,
    side,
    shares: TRADE_SIZE_SHARES,
  });

  const trade = {
    id: crypto.randomUUID(),
    market_id: scope.marketId,
    event_id: scope.eventId || scope.marketId,
    question: market.question,
    side,
    status: "open",
    execution_mode: execution.execution_mode,
    live_trade_enabled: execution.live_trade_enabled,
    amount_usdc: execution.amount_usdc,
    entry_price: execution.entry_price,
    shares: execution.shares,
    yes_score: roundNumber(scores.yesScore),
    no_score: roundNumber(scores.noScore),
    opened_at: execution.executed_at,
    closed_at: null,
    exit_price: null,
    gross_value_usdc: null,
    profit_usdc: null,
    reward_pool_usdc: null,
    platform_pool_usdc: null,
    external_order_id: execution.external_order_id,
    exit_reason: null,
    required_records: MIN_RECORDS_TO_TRADE,
    used_message_ids: eligibleMessages.map((message) => message.id),
    participants: buildParticipants(eligibleMessages, side),
    note: execution.note,
  };

  return insertTrade(trade);
}

async function maybeCloseTrade({ trade, market }) {
  if (!trade || trade.status !== "open") {
    return trade;
  }

  const { shouldClose, reason } = shouldCloseTrade(trade, market);

  if (!shouldClose) {
    return trade;
  }

  try {
    const execution = await executeMarketExit({
      market,
      side: trade.side,
      shares: Number(trade.shares),
      amountUsdc: Number(trade.amount_usdc),
      reason,
    });

    const nextTrade = withRewardSplit({
      ...trade,
      status: "settled",
      execution_mode: execution.execution_mode,
      live_trade_enabled: execution.live_trade_enabled,
      exit_price: execution.exit_price,
      gross_value_usdc: execution.gross_value_usdc,
      profit_usdc: execution.profit_usdc,
      closed_at: execution.closed_at,
      exit_reason: execution.exit_reason,
      note: execution.note,
    });

    return updateTrade(trade.id, nextTrade);
  } catch {
    return trade;
  }
}

export async function evaluateTradeForMarket({ marketId, eventId = "", marketSnapshot = null } = {}) {
  let market = marketSnapshot || (await getMarketSnapshotById(marketId));
  const scope = {
    marketId: normalizeId(marketId || market.marketId),
    eventId: normalizeId(eventId || market.eventId),
  };

  const missingPrices = !Number.isFinite(Number(market?.prices?.yes)) || !Number.isFinite(Number(market?.prices?.no));

  if (missingPrices || !scope.eventId) {
    try {
      market = await getMarketSnapshotById(scope.marketId);
      scope.eventId = normalizeId(scope.eventId || market.eventId);
    } catch {
      market = marketSnapshot || market;
    }
  }

  const [messages, trades] = await Promise.all([readMessages(), readTrades()]);
  const eligibleMessages = getEligibleMessages(messages, scope);
  const existingTrade = findTradeForScope(trades, scope);

  if (existingTrade) {
    const maybeClosedTrade = await maybeCloseTrade({
      trade: existingTrade,
      market,
    });

    return {
      trade: maybeClosedTrade,
      summary: buildTradeSummary({
        market,
        trade: maybeClosedTrade,
        messages: eligibleMessages,
      }),
    };
  }

  let trade = null;

  if (eligibleMessages.length >= MIN_RECORDS_TO_TRADE) {
    trade = await openTrade({
      market,
      eligibleMessages,
      scope,
    });
  }

  return {
    trade,
    summary: buildTradeSummary({
      market,
      trade,
      messages: eligibleMessages,
    }),
  };
}

export async function getTradeSummaryForMarket({ marketId, eventId = "", marketSnapshot = null } = {}) {
  const { summary } = await evaluateTradeForMarket({
    marketId,
    eventId,
    marketSnapshot,
  });

  return summary;
}
