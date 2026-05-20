import { promises as fs } from "fs";
import path from "path";

const currentMarketFilePath = path.join(process.cwd(), "data", "current-market.json");

async function ensureCurrentMarketFile() {
  try {
    await fs.access(currentMarketFilePath);
  } catch {
    await fs.writeFile(currentMarketFilePath, "{}\n", "utf8");
  }
}

export async function readCurrentMarket() {
  await ensureCurrentMarketFile();

  const raw = await fs.readFile(currentMarketFilePath, "utf8");

  if (!raw.trim()) {
    return null;
  }

  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  return Object.keys(parsed).length ? parsed : null;
}

export async function writeCurrentMarket(market) {
  await ensureCurrentMarketFile();
  await fs.writeFile(currentMarketFilePath, `${JSON.stringify(market, null, 2)}\n`, "utf8");
  return market;
}

