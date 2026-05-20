import { NextResponse } from "next/server";
import { getActiveEsportsMarket } from "@/lib/active-market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const market = await getActiveEsportsMarket();
    const currentUrl = new URL(request.url);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

    return NextResponse.json({
      market_id: market.marketId || market.id,
      event_id: market.eventId || market.marketId || market.id,
      market_slug: market.slug || "",
      question: market.question,
      yes_outcome: market.outcomes?.yes || "",
      no_outcome: market.outcomes?.no || "",
      yes_price: market.prices?.yes ?? null,
      no_price: market.prices?.no ?? null,
      source_event: market.competition || market.rawQuestion || market.question,
      source_url: market.sourceUrl || "",
      status: market.status,
      liquidity: market.liquidity || 0,
      volume_24hr: market.volume24hr || 0,
      resolution_source: market.resolutionSource || "",
      start_date: market.startDate || "",
      updated_at: market.updatedAt || new Date().toISOString(),
      current_market_url: `${baseUrl}/api/market/current`,
      submission_url: `${baseUrl}/api/messages`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load current market.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
