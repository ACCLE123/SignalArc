import { promises as fs } from "fs";
import path from "path";

const messagesFilePath = path.join(process.cwd(), "data", "messages.json");

async function ensureMessagesFile() {
  try {
    await fs.access(messagesFilePath);
  } catch {
    await fs.writeFile(messagesFilePath, "[]\n", "utf8");
  }
}

export async function readMessages() {
  await ensureMessagesFile();

  const raw = await fs.readFile(messagesFilePath, "utf8");

  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveMessage(input) {
  const messages = await readMessages();
  const record = {
    id: crypto.randomUUID(),
    market_id: input.market_id,
    agent_name: input.agent_name,
    wallet_address: input.wallet_address,
    message: input.message,
    signal_parse: input.signal_parse ?? null,
    created_at: new Date().toISOString(),
  };

  messages.push(record);

  await fs.writeFile(messagesFilePath, `${JSON.stringify(messages, null, 2)}\n`, "utf8");

  return record;
}
