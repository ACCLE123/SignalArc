import { unstable_cache } from "next/cache";
import fallbackMarket from "@/data/market.json";
import { readCurrentMarket, writeCurrentMarket } from "@/lib/current-market-store";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const ESPORTS_TAG_ID = "64";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(value) {
  if (!value) {
    return Number.NaN;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function parseArrayValue(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseOutcomes(value) {
  return parseArrayValue(value);
}

function parseOutcomePrices(value) {
  return parseArrayValue(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .map((item) => Number(item.toFixed(4)));
}

function buildPriceSnapshot(outcomes, outcomePrices) {
  if (outcomes.length < 2 || outcomePrices.length < 2) {
    return {
      yes: null,
      no: null,
    };
  }

  return {
    yes: outcomePrices[0],
    no: outcomePrices[1],
  };
}

function pickPrimaryMarket(event) {
  const markets = Array.isArray(event?.markets)
    ? event.markets.filter((market) => market?.active && !market?.closed && market?.acceptingOrders !== false)
    : [];

  const candidates = markets
    .map((market) => ({
      market,
      outcomes: parseOutcomes(market.outcomes),
    }))
    .filter(({ outcomes }) => outcomes.length === 2);

  if (!candidates.length) {
    return null;
  }

  return candidates
    .sort((left, right) => {
      const leftIsPrimary =
        left.market?.sportsMarketType === "moneyline" ||
        left.market?.groupItemTitle?.toLowerCase() === "match winner" ||
        left.market?.question === event?.title;
      const rightIsPrimary =
        right.market?.sportsMarketType === "moneyline" ||
        right.market?.groupItemTitle?.toLowerCase() === "match winner" ||
        right.market?.question === event?.title;

      if (leftIsPrimary !== rightIsPrimary) {
        return Number(rightIsPrimary) - Number(leftIsPrimary);
      }

      return toNumber(right.market?.liquidityNum ?? right.market?.liquidity) - toNumber(left.market?.liquidityNum ?? left.market?.liquidity);
    })[0];
}

function formatQuestion(outcomes, fallbackQuestion) {
  if (outcomes.length >= 2) {
    return `Will ${outcomes[0]} beat ${outcomes[1]}?`;
  }

  return fallbackQuestion;
}

function buildDescription(event, market, outcomes) {
  const competition = event?.title || market?.question || "Live Polymarket esports market";
  const focus =
    market?.groupItemTitle?.toLowerCase() === "match winner" || market?.sportsMarketType === "moneyline"
      ? "The primary market tracks the match winner."
      : "The market tracks the leading binary outcome for this event.";

  if (outcomes.length >= 2) {
    return `${competition}. ${focus} YES means ${outcomes[0]} wins. NO means ${outcomes[1]} wins.`;
  }

  return `${competition}. ${focus}`;
}

function getTagLabel(tags) {
  if (!Array.isArray(tags)) {
    return "esports";
  }

  const tag = tags.find((item) => item?.slug && item.slug !== "esports");
  return tag?.label || "esports";
}

function buildSourceUrl(slug) {
  return slug ? `https://polymarket.com/event/${slug}` : "";
}

function eventHasEnded(event, market) {
  const now = Date.now();
  const eventEnded = event?.ended === true || event?.live === false && event?.score && event?.period;
  const eventEndDate = toTimestamp(event?.endDate);
  const marketEndDate = toTimestamp(market?.endDate || market?.eventStartTime);
  const resolutionStatuses = typeof market?.umaResolutionStatuses === "string" ? market.umaResolutionStatuses.toLowerCase() : "";
  const resolutionStatus = typeof market?.umaResolutionStatus === "string" ? market.umaResolutionStatus.toLowerCase() : "";
  const isResolvedOrProposed = resolutionStatus === "resolved" || resolutionStatus === "proposed" || resolutionStatuses.includes("resolved") || resolutionStatuses.includes("proposed");

  if (eventEnded || isResolvedOrProposed) {
    return true;
  }

  if (Number.isFinite(eventEndDate) && eventEndDate <= now) {
    return true;
  }

  if (Number.isFinite(marketEndDate) && marketEndDate <= now) {
    return true;
  }

  return false;
}

function fallbackPayload() {
  return {
    ...fallbackMarket,
    marketId: String(fallbackMarket.id),
    eventId: String(fallbackMarket.id),
    source: "fallback",
    category: "esports",
    competition: fallbackMarket.question,
    sourceUrl: "",
    prices: {
      yes: null,
      no: null,
    },
    active: false,
    closed: false,
    acceptingOrders: false,
    resolutionStatus: "",
    endDate: "",
    liquidity: 0,
    volume24hr: 0,
    updatedAt: new Date().toISOString(),
  };
}

function hasSnapshotEnded(snapshot) {
  if (!snapshot) {
    return true;
  }

  const now = Date.now();
  const resolutionStatus = typeof snapshot?.resolutionStatus === "string" ? snapshot.resolutionStatus.toLowerCase() : "";
  const eventEndDate = toTimestamp(snapshot?.endDate);
  const startDate = toTimestamp(snapshot?.startDate);
  const explicitClosed = snapshot?.active === false || snapshot?.closed === true || snapshot?.acceptingOrders === false;
  const isResolvedOrProposed = resolutionStatus.includes("resolved") || resolutionStatus.includes("proposed");

  if (explicitClosed || isResolvedOrProposed) {
    return true;
  }

  if (Number.isFinite(eventEndDate) && eventEndDate <= now) {
    return true;
  }

  if (Number.isFinite(startDate) && startDate <= now && snapshot?.status === "Closed") {
    return true;
  }

  return false;
}

async function fetchActiveEsportsMarketUncached() {
  const url = new URL("/events", GAMMA_API_BASE);
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("tag_id", ESPORTS_TAG_ID);
  url.searchParams.set("order", "liquidity");
  url.searchParams.set("ascending", "false");
  url.searchParams.set("limit", "40");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Gamma API returned ${response.status}`);
    }

    const events = await response.json();

    if (!Array.isArray(events)) {
      throw new Error("Gamma API payload was not an array.");
    }

    const candidates = events
      .map((event) => {
        const primary = pickPrimaryMarket(event);

        if (!primary) {
          return null;
        }

        if (eventHasEnded(event, primary.market)) {
          return null;
        }

        return {
          event,
          market: primary.market,
          outcomes: primary.outcomes,
          prices: buildPriceSnapshot(primary.outcomes, parseOutcomePrices(primary.market?.outcomePrices)),
          liquidity: toNumber(primary.market?.liquidityNum ?? primary.market?.liquidity),
          volume24hr: toNumber(primary.market?.volume24hr),
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.liquidity !== right.liquidity) {
          return right.liquidity - left.liquidity;
        }

        return right.volume24hr - left.volume24hr;
      });

    const top = candidates[0];

    if (!top) {
      return fallbackPayload();
    }

    const question = formatQuestion(top.outcomes, top.market?.question || top.event?.title || fallbackMarket.question);

    return {
      id: String(top.market?.id || top.event?.id || fallbackMarket.id),
      marketId: String(top.market?.id || top.event?.id || fallbackMarket.id),
      eventId: String(top.event?.id || top.market?.events?.[0]?.id || top.market?.id || fallbackMarket.id),
      question,
      description: buildDescription(top.event, top.market, top.outcomes),
      status: top.market?.active && !top.market?.closed ? "Open" : "Closed",
      active: Boolean(top.market?.active),
      closed: Boolean(top.market?.closed),
      acceptingOrders: top.market?.acceptingOrders !== false,
      outcomes: {
        yes: `${top.outcomes[0]} wins`,
        no: `${top.outcomes[1]} wins`,
      },
      prices: top.prices,
      source: "polymarket",
      category: getTagLabel(top.event?.tags),
      competition: top.event?.title || top.market?.question || question,
      sourceUrl: buildSourceUrl(top.market?.slug || top.event?.slug),
      liquidity: top.liquidity,
      volume24hr: top.volume24hr,
      startDate: top.market?.eventStartTime || top.event?.startDate || top.market?.startDate || "",
      endDate: top.market?.endDate || top.event?.endDate || "",
      resolutionSource: top.market?.resolutionSource || top.event?.resolutionSource || "",
      resolutionStatus: top.market?.umaResolutionStatus || top.market?.umaResolutionStatuses || "",
      rawQuestion: top.market?.question || top.event?.title || "",
      slug: top.market?.slug || top.event?.slug || "",
      updatedAt: top.market?.updatedAt || top.event?.updatedAt || new Date().toISOString(),
    };
  } catch {
    return fallbackPayload();
  }
}

const getCachedActiveEsportsMarket = unstable_cache(fetchActiveEsportsMarketUncached, ["active-esports-market"], {
  revalidate: 300,
});

export async function getActiveEsportsMarket() {
  const pinnedMarket = await readCurrentMarket();

  if (pinnedMarket?.marketId && !hasSnapshotEnded(pinnedMarket)) {
    try {
      const refreshedPinnedMarket = await getMarketSnapshotById(pinnedMarket.marketId);

      if (!hasSnapshotEnded(refreshedPinnedMarket)) {
        await writeCurrentMarket(refreshedPinnedMarket);
        return refreshedPinnedMarket;
      }
    } catch {
      return pinnedMarket;
    }
  }

  const nextMarket = await getCachedActiveEsportsMarket();

  if (nextMarket?.source === "polymarket" && nextMarket?.marketId) {
    await writeCurrentMarket(nextMarket);
  }

  if (nextMarket?.source === "fallback" && pinnedMarket?.marketId && !hasSnapshotEnded(pinnedMarket)) {
    return pinnedMarket;
  }

  return nextMarket;
}

export async function getMarketSnapshotById(marketId) {
  const normalizedMarketId = String(marketId || "").trim();

  if (!normalizedMarketId) {
    throw new Error("marketId is required.");
  }

  const response = await fetch(`${GAMMA_API_BASE}/markets/${normalizedMarketId}`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Gamma market API returned ${response.status}`);
  }

  const market = await response.json();
  const outcomes = parseOutcomes(market?.outcomes);
  const outcomePrices = parseOutcomePrices(market?.outcomePrices);
  const event = Array.isArray(market?.events) ? market.events[0] : null;
  const question = formatQuestion(outcomes, market?.question || event?.title || fallbackMarket.question);

  return {
    id: String(market?.id || normalizedMarketId),
    marketId: String(market?.id || normalizedMarketId),
    eventId: String(event?.id || market?.id || normalizedMarketId),
    question,
    description: buildDescription(event, market, outcomes),
    status: market?.active && !market?.closed ? "Open" : "Closed",
    active: Boolean(market?.active),
    closed: Boolean(market?.closed),
    acceptingOrders: market?.acceptingOrders !== false,
    outcomes: {
      yes: outcomes[0] ? `${outcomes[0]} wins` : "",
      no: outcomes[1] ? `${outcomes[1]} wins` : "",
    },
    prices: buildPriceSnapshot(outcomes, outcomePrices),
    source: "polymarket",
    category: getTagLabel(event?.tags || market?.tags),
    competition: event?.title || market?.question || question,
    sourceUrl: buildSourceUrl(market?.slug || event?.slug),
    liquidity: toNumber(market?.liquidityNum ?? market?.liquidity),
    volume24hr: toNumber(market?.volume24hr),
    startDate: market?.eventStartTime || event?.startDate || market?.startDate || "",
    endDate: market?.endDate || event?.endDate || "",
    resolutionSource: market?.resolutionSource || event?.resolutionSource || "",
    resolutionStatus: market?.umaResolutionStatus || market?.umaResolutionStatuses || "",
    rawQuestion: market?.question || event?.title || "",
    slug: market?.slug || event?.slug || "",
    updatedAt: market?.updatedAt || event?.updatedAt || new Date().toISOString(),
  };
}
