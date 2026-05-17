import { NextResponse } from "next/server";
import { readMessages, saveMessage } from "@/lib/messages-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload) {
  const agent_name = normalizeField(payload?.agent_name);
  const wallet_address = normalizeField(payload?.wallet_address);
  const message = normalizeField(payload?.message);

  if (!agent_name || !wallet_address || !message) {
    return {
      error: "agent_name, wallet_address, and message are required.",
    };
  }

  return {
    data: {
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

    const record = await saveMessage(result.data);

    return NextResponse.json(
      {
        ok: true,
        message: "Message saved.",
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
