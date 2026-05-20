const DEEPSEEK_API_BASE = "https://api.deepseek.com/beta";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";

function clamp01(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed <= 0) {
    return 0;
  }

  if (parsed >= 1) {
    return 1;
  }

  return parsed;
}

function normalizeConfidences(yesConfidence, noConfidence) {
  const yes = clamp01(yesConfidence);
  const no = clamp01(noConfidence);

  if (yes === null || no === null) {
    return null;
  }

  const total = yes + no;

  if (total <= 0) {
    return {
      yes_confidence: 0.5,
      no_confidence: 0.5,
    };
  }

  const normalizedYes = yes / total;
  const normalizedNo = no / total;

  return {
    yes_confidence: Number(normalizedYes.toFixed(6)),
    no_confidence: Number(normalizedNo.toFixed(6)),
  };
}

function buildMessages({ marketId, message, marketQuestion, yesOutcome, noOutcome }) {
  return [
    {
      role: "system",
      content:
        "You extract directional confidence for a prediction market message. Return exactly one tool call. Estimate probabilities from 0 to 1 for YES and NO. The two values should reflect the message's directional leaning and be suitable for aggregation in paper trading.",
    },
    {
      role: "user",
      content: `Market id: ${marketId}
Market question: ${marketQuestion || "Unknown"}
YES outcome meaning: ${yesOutcome || "Unknown"}
NO outcome meaning: ${noOutcome || "Unknown"}

Agent message:
${message}`,
    },
  ];
}

function buildToolDefinition() {
  return [
    {
      type: "function",
      function: {
        name: "return_signal_parse",
        strict: true,
        description: "Return the parsed SignalArc market confidence result.",
        parameters: {
          type: "object",
          properties: {
            market_id: {
              type: "string",
              description: "The market id supplied in the input.",
            },
            yes_confidence: {
              type: "number",
              description: "A floating-point confidence from 0 to 1 for the YES side.",
              minimum: 0,
              maximum: 1,
            },
            no_confidence: {
              type: "number",
              description: "A floating-point confidence from 0 to 1 for the NO side.",
              minimum: 0,
              maximum: 1,
            },
          },
          required: ["market_id", "yes_confidence", "no_confidence"],
          additionalProperties: false,
        },
      },
    },
  ];
}

function buildSkippedParse({ marketId, reason }) {
  return {
    market_id: marketId,
    yes_confidence: null,
    no_confidence: null,
    direction: null,
    parse_status: reason,
    provider: "deepseek",
    model: process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
    parsed_at: new Date().toISOString(),
  };
}

export async function parseSignalMessage({ marketId, message, marketQuestion, yesOutcome, noOutcome }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL;

  if (!apiKey) {
    return buildSkippedParse({
      marketId,
      reason: "skipped_missing_api_key",
    });
  }

  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildMessages({
          marketId,
          message,
          marketQuestion,
          yesOutcome,
          noOutcome,
        }),
        tools: buildToolDefinition(),
        tool_choice: {
          type: "function",
          function: {
            name: "return_signal_parse",
          },
        },
        stream: false,
        thinking: {
          type: "disabled",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return {
        ...buildSkippedParse({
          marketId,
          reason: "failed_api_error",
        }),
        error: `DeepSeek API returned ${response.status}: ${errorText.slice(0, 400)}`,
      };
    }

    const payload = await response.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    const rawArguments = toolCall?.function?.arguments;

    if (!rawArguments) {
      return {
        ...buildSkippedParse({
          marketId,
          reason: "failed_no_tool_call",
        }),
        error: "DeepSeek returned no tool call arguments.",
      };
    }

    const parsedArguments = JSON.parse(rawArguments);
    const normalized = normalizeConfidences(parsedArguments?.yes_confidence, parsedArguments?.no_confidence);

    if (!normalized) {
      return {
        ...buildSkippedParse({
          marketId,
          reason: "failed_invalid_confidence",
        }),
        error: "DeepSeek returned invalid confidence values.",
      };
    }

    const finalMarketId = typeof parsedArguments?.market_id === "string" && parsedArguments.market_id.trim() ? parsedArguments.market_id.trim() : marketId;
    const direction = normalized.yes_confidence >= normalized.no_confidence ? "YES" : "NO";

    return {
      market_id: finalMarketId,
      yes_confidence: normalized.yes_confidence,
      no_confidence: normalized.no_confidence,
      direction,
      parse_status: "parsed",
      provider: "deepseek",
      model,
      parsed_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...buildSkippedParse({
        marketId,
        reason: "failed_exception",
      }),
      error: error instanceof Error ? error.message : "Unknown parser error",
    };
  }
}
