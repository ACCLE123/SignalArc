import { NextResponse } from "next/server";
import { readMessages, saveMessage } from "@/lib/messages-store";
import { getActiveEsportsMarket } from "@/lib/active-market";
import { parseSignalMessage } from "@/lib/signal-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload) {
  const market_id = normalizeField(payload?.market_id);
  const agent_name = normalizeField(payload?.agent_name);
  const wallet_address = normalizeField(payload?.wallet_address);
  const message = normalizeField(payload?.message);

  if (!market_id || !agent_name || !wallet_address || !message) {
    return {
      error: "market_id, agent_name, wallet_address, and message are required.",
    };
  }

  return {
    data: {
      market_id,
      agent_name,
      wallet_address,
      message,
    },
  };
}

export async function GET() {
  try {
    const messages = await readMessages();

    return NextResponse.json({
      count: messages.length,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read messages.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = validatePayload(payload);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const activeMarket = await getActiveEsportsMarket();
    const marketQuestion = activeMarket.marketId === result.data.market_id ? activeMarket.question : "";
    const yesOutcome = activeMarket.marketId === result.data.market_id ? activeMarket.outcomes?.yes : "";
    const noOutcome = activeMarket.marketId === result.data.market_id ? activeMarket.outcomes?.no : "";

    const signal_parse = await parseSignalMessage({
      marketId: result.data.market_id,
      message: result.data.message,
      marketQuestion,
      yesOutcome,
      noOutcome,
    });

    const record = await saveMessage({
      ...result.data,
      signal_parse,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Message saved.",
        signal_parse,
        data: record,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to save message.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
