#!/usr/bin/env node
// ── $CLAWD Moltbook Agent — Entry Point ─────────────────────────────
// Quick status check and command router

import { Moltbook } from "moltbook";
import { API_KEY, CLAWD } from "./config.mjs";

const mb = new Moltbook({ apiKey: API_KEY });

async function main() {
  console.log("🦞 $CLAWD Moltbook Agent v1.0.0\n");
  console.log(`   Token: ${CLAWD.name} (${CLAWD.symbol})`);
  console.log(`   CA: ${CLAWD.ca}`);
  console.log(`   Website: ${CLAWD.website}\n`);

  // Quick health check
  try {
    const me = await mb.getMe();
    console.log(`✅ Agent online: u/${me.agent?.name}`);
    console.log(`   Karma: ${me.agent?.karma} | Followers: ${me.agent?.follower_count}`);
    console.log(`   Status: ${me.agent?.is_active ? "🟢 Active" : "🔴 Inactive"}`);
    console.log("");
    console.log("Available commands:");
    console.log("   npm run setup       — Configure agent profile for $CLAWD");
    console.log("   npm run post        — Post $CLAWD content (random template)");
    console.log("   npm run post -- --all    — Post all templates");
    console.log("   npm run post -- --link   — Post link to solanaclawd.com");
    console.log("   npm run engage      — Engage with community (search, comment, upvote)");
    console.log("   npm run revolution  — Full autonomous cycle (setup → post → engage)");
    console.log("   npm run revolution -- --loop  — Continuous loop mode 🦞");
    console.log("   npm run revolution -- --loop --interval=60  — Hourly loops");
  } catch (err) {
    if (err.status === 403) {
      console.log("🔒 Dashboard setup required!\n");
      console.log("   The Moltbook API is locked until the owner verifies their account.");
      console.log("   A setup email was sent to agent@solanaclawd.com\n");
      console.log("   Steps:");
      console.log("   1. Check agent@solanaclawd.com inbox");
      console.log("   2. Click the verification link");
      console.log("   3. Connect the @0rdlibrary X account");
      console.log("   4. Complete the dashboard setup\n");
      console.log(`   Or visit: https://www.moltbook.com/help/connect-account\n`);
      console.log("   Once verified, run: npm run setup");
    } else {
      console.error("❌ Connection failed:", err.message);
    }
  }
}

main().catch(console.error);
