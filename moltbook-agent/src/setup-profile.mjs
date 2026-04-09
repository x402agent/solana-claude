#!/usr/bin/env node
// ── Setup $CLAWD Agent Profile on Moltbook ──────────────────────────
// Uses official Moltbook API (skill.md v1.12.0) — direct HTTP calls

import * as api from "./api.mjs";
import { AGENT_PROFILE, CLAWD, TARGET_SUBMELTS } from "./config.mjs";

async function setupProfile() {
  console.log("🦞 Setting up $CLAWD agent profile on Moltbook...\n");

  // 1. Check claim status first
  try {
    const status = await api.getClaimStatus();
    console.log(`📋 Claim status: ${status?.status || "unknown"}`);
    if (status?.status === "pending_claim") {
      console.log("\n🔒 Account not yet claimed!");
      console.log("   Your human needs to:");
      console.log("   1. Visit the claim URL sent during registration");
      console.log("   2. Verify their email");
      console.log("   3. Post a verification tweet");
      console.log("   4. Complete the dashboard setup\n");
      process.exit(1);
    }
  } catch (err) {
    if (err.status === 403) {
      console.log("\n🔒 Access denied — account not verified yet!");
      console.log("   Check agent@solanaclawd.com for the claim email");
      console.log("   Visit: https://www.moltbook.com/login\n");
      process.exit(1);
    }
    console.error("⚠️  Status check failed:", err.message);
  }

  // 2. Get current profile
  try {
    const me = await api.getMe();
    console.log("📋 Current profile:");
    console.log(`   Name: ${me?.agent?.name || me?.name}`);
    console.log(`   Description: ${(me?.agent?.description || me?.description || "(none)").slice(0, 80)}`);
    console.log(`   Karma: ${me?.agent?.karma || me?.karma || 0}`);
    console.log(`   Followers: ${me?.agent?.follower_count || 0}`);
    console.log("");
  } catch (err) {
    console.error("⚠️  Could not fetch profile:", err.message);
    throw err;
  }

  // 3. Update profile with $CLAWD branding (PATCH, not PUT!)
  console.log("✏️  Updating profile for $CLAWD...");
  try {
    const updated = await api.updateProfile({
      description: AGENT_PROFILE.description,
      metadata: AGENT_PROFILE.metadata,
    });
    console.log("✅ Profile updated!");
    if (updated?.agent?.description) {
      console.log(`   Description: ${updated.agent.description.slice(0, 80)}...`);
    }
  } catch (err) {
    console.error("❌ Failed to update profile:", err.message);
  }

  // 4. Subscribe to target submelts
  console.log("\n📡 Subscribing to target submelts...");
  for (const submolt of TARGET_SUBMELTS) {
    try {
      await api.subscribe(submolt);
      console.log(`   ✅ Subscribed to m/${submolt}`);
    } catch (err) {
      console.log(`   ⏭️  m/${submolt}: ${err.message?.slice(0, 60) || "skipped"}`);
    }
  }

  // 5. Follow key agents
  const agentsToFollow = ["ClawdClawderberg", "Onchain3r", "eudaemon_0"];
  console.log("\n👥 Following key agents...");
  for (const agent of agentsToFollow) {
    try {
      await api.followAgent(agent);
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
