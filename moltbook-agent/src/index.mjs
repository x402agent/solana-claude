#!/usr/bin/env node
// ── $CLAWD Moltbook Agent — Entry Point ─────────────────────────────
// Uses official Moltbook API (skill.md v1.12.0) — direct HTTP calls

import * as api from "./api.mjs";
import { CLAWD } from "./config.mjs";

async function main() {
  console.log("🦞 $CLAWD Moltbook Agent v2.0.0\n");
  console.log(`   Token: ${CLAWD.name} (${CLAWD.symbol})`);
  console.log(`   CA: ${CLAWD.ca}`);
  console.log(`   Website: ${CLAWD.website}`);
  console.log(`   API: Official Moltbook skill.md v1.12.0\n`);

  // Quick health check via /home (the recommended starting point)
  try {
    const dashboard = await api.home();
    const acct = dashboard?.your_account;

    console.log(`✅ Agent online: u/${acct?.name}`);
    console.log(`   Karma: ${acct?.karma} | Unread: ${acct?.unread_notification_count}`);

    // Show DM status
    const dms = dashboard?.your_direct_messages;
    if (dms?.pending_request_count > 0 || dms?.unread_message_count > 0) {
      console.log(`   📬 DMs: ${dms.pending_request_count || 0} pending, ${dms.unread_message_count || 0} unread`);
    }

    // Show activity on our posts
    const activity = dashboard?.activity_on_your_posts || [];
    if (activity.length > 0) {
      const totalNotifs = activity.reduce((sum, a) => sum + (a.new_notification_count || 0), 0);
      console.log(`   💬 ${totalNotifs} new comment(s) across ${activity.length} post(s)`);
    }

    // Show what to do next
    if (dashboard?.what_to_do_next?.length) {
      console.log("\n   📋 What to do next:");
      for (const item of dashboard.what_to_do_next) {
        console.log(`      • ${item}`);
      }
    }

    console.log("\n   Available commands:");
    console.log("   npm run setup       — Configure agent profile for $CLAWD");
    console.log("   npm run post        — Post $CLAWD content (random template)");
    console.log("   npm run post -- --all    — Post all templates (one per 31 min)");
    console.log("   npm run post -- --link   — Post link to solanaclawd.com");
    console.log("   npm run engage      — Engage: respond, upvote, comment, browse");
    console.log("   npm run revolution  — Full autonomous cycle");
    console.log("   npm run revolution -- --loop  — Continuous loop mode 🦞");
    console.log("   npm run revolution -- --loop --interval=60  — Hourly loops");
  } catch (err) {
    if (err.status === 403) {
      console.log("🔒 Account not yet verified!\n");
      console.log("   The API is locked until the owner claims the account.");
      console.log("   A setup email was sent to agent@solanaclawd.com\n");
      console.log("   Steps:");
      console.log("   1. Check agent@solanaclawd.com inbox");
      console.log("   2. Click the claim URL link");
      console.log("   3. Verify email and connect X account");
      console.log("   4. Post verification tweet\n");
      console.log(`   Or visit: https://www.moltbook.com/login\n`);
      console.log("   Once verified, run: npm run setup");
    } else {
      console.error("❌ Connection failed:", err.message);
      if (err.body) console.error("   Body:", JSON.stringify(err.body).slice(0, 200));
    }
  }
}

main().catch(console.error);
