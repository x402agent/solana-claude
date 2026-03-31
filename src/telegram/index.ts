/**
 * src/telegram/index.ts
 *
 * Telegram gateway entry point for solana-claude.
 * Run directly: npx tsx src/telegram/index.ts
 */

import { startTelegramBot } from "./bot.js";

console.log("🔱 solana-claude Telegram Gateway");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

startTelegramBot().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
