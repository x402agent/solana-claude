#!/usr/bin/env node
// ── Setup $CLAWD Agent Profile on Moltbook ──────────────────────────
// Updates the mawdbot agent profile for the $CLAWD lobster revolution

import { Moltbook } from "moltbook";
import { API_KEY, AGENT_PROFILE, CLAWD, TARGET_SUBMELTS } from "./config.mjs";

const mb = new Moltbook({ apiKey: API_KEY });

async function setupProfile() {
  console.log("🦞 Setting up $CLAWD agent profile on Moltbook...\n");

  // 1. Check current profile
  try {
    const current = await mb.getMe();
    console.log("📋 Current profile:");
    console.log(`   Name: ${current.agent?.name}`);
    console.log(`   Description: ${current.agent?.description || "(none)"}`);
    console.log(`   Karma: ${current.agent?.karma}`);
    console.log(`   Followers: ${current.agent?.follower_count}`);
    console.log("");
  } catch (err) {
    console.error("⚠️  Could not fetch profile:", err.message);
    if (err.status === 403) {
      console.log("\n🔒 Dashboard setup required!");
      console.log("   Your human needs to:");
      console.log("   1. Check agent@solanaclawd.com for the verification email");
      console.log("   2. Click the link and verify their X account");
      console.log("   3. Complete the dashboard setup");
      console.log(`\n   Or visit: https://www.moltbook.com/help/connect-account\n`);
      process.exit(1);
    }
    throw err;
  }

  // 2. Update profile with $CLAWD branding
  console.log("✏️  Updating profile for $CLAWD...");
  try {
    const updated = await mb.updateProfile({
      description: AGENT_PROFILE.description,
      metadata: AGENT_PROFILE.metadata,
    });
    console.log("✅ Profile updated!");
    console.log(`   Description: ${updated.agent?.description?.slice(0, 80)}...`);
  } catch (err) {
    console.error("❌ Failed to update profile:", err.message);
  }

  // 3. Subscribe to target submelts
  console.log("\n📡 Subscribing to target submelts...");
  for (const submolt of TARGET_SUBMELTS) {
    try {
      await mb.subscribeToSubmolt(submolt);
      console.log(`   ✅ Subscribed to m/${submolt}`);
    } catch (err) {
      console.log(`   ⏭️  m/${submolt}: ${err.message?.slice(0, 60) || "skipped"}`);
    }
  }

  // 4. Follow key agents
  const agentsToFollow = ["ClawdClawderberg", "Onchain3r", "eudaemon_0"];
  console.log("\n👥 Following key agents...");
  for (const agent of agentsToFollow) {
    try {
      await mb.followAgent(agent);
      console.log(`   ✅ Followed u/${agent}`);
    } catch (err) {
      console.log(`   ⏭️  u/${agent}: ${err.message?.slice(0, 60) || "skipped"}`);
    }
  }

  console.log("\n🦞 $CLAWD agent profile setup complete!");
  console.log(`   Token: ${CLAWD.name} (${CLAWD.symbol})`);
  console.log(`   CA: ${CLAWD.ca}`);
  console.log(`   Website: ${CLAWD.website}`);
  console.log(`\n   Run 'npm run post' to start posting $CLAWD content`);
  console.log(`   Run 'npm run engage' to engage with the community`);
  console.log(`   Run 'npm run revolution' for full autonomous mode 🦞\n`);
}

setupProfile().catch((err) => {
  console.error("💀 Setup failed:", err.message);
  process.exit(1);
});
