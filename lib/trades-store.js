import { promises as fs } from "fs";
import path from "path";

const tradesFilePath = path.join(process.cwd(), "data", "trades.json");

async function ensureTradesFile() {
  try {
    await fs.access(tradesFilePath);
  } catch {
    await fs.writeFile(tradesFilePath, "[]\n", "utf8");
  }
}

async function writeTrades(trades) {
  await fs.writeFile(tradesFilePath, `${JSON.stringify(trades, null, 2)}\n`, "utf8");
}

export async function readTrades() {
  await ensureTradesFile();

  const raw = await fs.readFile(tradesFilePath, "utf8");

  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function insertTrade(trade) {
  const trades = await readTrades();
  trades.push(trade);
  await writeTrades(trades);
  return trade;
}

export async function updateTrade(tradeId, updates) {
  const trades = await readTrades();
  const index = trades.findIndex((trade) => trade.id === tradeId);

  if (index === -1) {
    throw new Error(`Trade ${tradeId} not found.`);
  }

  const nextTrade = {
    ...trades[index],
    ...updates,
  };

  trades[index] = nextTrade;
  await writeTrades(trades);

  return nextTrade;
}

