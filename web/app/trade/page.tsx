import fs from "fs";
import path from "path";
import { TradeClient } from "./TradeClient";

export const metadata = {
  title: "Trading Skill — $CLAWD",
  description:
    "Pump.fun trading agent skill — token tiers, OODA execution workflow, position sizing, and guardrails for the $CLAWD Solana agent stack.",
};

export default function TradePage() {
  const root = path.resolve(process.cwd(), "..");
  const fp = path.join(root, "docs/TRADE.md");
  const content = fs.existsSync(fp)
    ? fs.readFileSync(fp, "utf-8")
    : "*TRADE.md not found*";

  return <TradeClient content={content} />;
}
