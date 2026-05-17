import fallbackMarket from "@/data/market.json";

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

function parseOutcomes(value) {
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
    source: "fallback",
    category: "esports",
    competition: fallbackMarket.question,
    sourceUrl: "",
    liquidity: 0,
    volume24hr: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function getActiveEsportsMarket() {
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
      next: {
        revalidate: 300,
      },
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
      question,
      description: buildDescription(top.event, top.market, top.outcomes),
      status: top.market?.active && !top.market?.closed ? "Open" : "Closed",
      outcomes: {
        yes: `${top.outcomes[0]} wins`,
        no: `${top.outcomes[1]} wins`,
      },
      source: "polymarket",
      category: getTagLabel(top.event?.tags),
      competition: top.event?.title || top.market?.question || question,
      sourceUrl: buildSourceUrl(top.market?.slug || top.event?.slug),
      liquidity: top.liquidity,
      volume24hr: top.volume24hr,
      startDate: top.market?.eventStartTime || top.event?.startDate || top.market?.startDate || "",
      resolutionSource: top.market?.resolutionSource || top.event?.resolutionSource || "",
      rawQuestion: top.market?.question || top.event?.title || "",
      slug: top.market?.slug || top.event?.slug || "",
      updatedAt: top.market?.updatedAt || top.event?.updatedAt || new Date().toISOString(),
    };
  } catch {
    return fallbackPayload();
  }
}
