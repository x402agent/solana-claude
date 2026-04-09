#!/usr/bin/env node
// ── 🦞 THE LOBSTER REVOLUTION ───────────────────────────────────────
// Full autonomous mode: setup → post → engage → repeat
// The agentic Solana lobster revolution on Moltbook

import { Moltbook } from "moltbook";
import {
  API_KEY,
  AGENT_PROFILE,
  POST_TEMPLATES,
  COMMENT_TEMPLATES,
  CLAWD,
  TARGET_SUBMELTS,
} from "./config.mjs";

const mb = new Moltbook({ apiKey: API_KEY });

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Phase 1: Profile Setup ──
async function phaseSetup() {
  console.log("\n═══════════════════════════════════════");
  console.log("  🦞 PHASE 1: PROFILE SETUP");
  console.log("═══════════════════════════════════════\n");

  try {
    const me = await mb.getMe();
    console.log(`✅ Agent online: u/${me.agent?.name} (${me.agent?.karma} karma)`);

    // Update profile if needed
    if (!me.agent?.description?.includes("CLAWD")) {
      console.log("✏️  Updating profile for $CLAWD...");
      await mb.updateProfile({
        description: AGENT_PROFILE.description,
        metadata: AGENT_PROFILE.metadata,
      });
      console.log("✅ Profile updated with $CLAWD branding");
    } else {
      console.log("✅ Profile already branded for $CLAWD");
    }

    // Subscribe to submelts
    for (const s of TARGET_SUBMELTS) {
      try {
        await mb.subscribeToSubmolt(s);
      } catch {}
    }
    console.log(`✅ Subscribed to ${TARGET_SUBMELTS.length} submelts`);

    // Follow key agents
    for (const agent of ["ClawdClawderberg", "Onchain3r", "eudaemon_0"]) {
      try {
        await mb.followAgent(agent);
      } catch {}
    }
    console.log("✅ Following key agents");

    return true;
  } catch (err) {
    if (err.status === 403) {
      console.error("🔒 BLOCKED: Dashboard setup required!");
      console.error("   Check agent@solanaclawd.com for verification email");
      console.error("   Visit: https://www.moltbook.com/help/connect-account");
      return false;
    }
    console.error("❌ Setup failed:", err.message);
    return false;
  }
}

// ── Phase 2: Post Content ──
async function phasePost() {
  console.log("\n═══════════════════════════════════════");
  console.log("  📝 PHASE 2: POST CONTENT");
  console.log("═══════════════════════════════════════\n");

  const template = pickRandom(POST_TEMPLATES);
  console.log(`📝 Posting to m/${template.submolt}: ${template.title}`);

  try {
    const post = await mb.createTextPost({
      submolt: template.submolt,
      title: template.title,
      content: template.content,
    });
    console.log(`✅ Post created! ID: ${post.id}`);
    return post;
  } catch (err) {
    console.error(`❌ Post failed: ${err.message}`);
    return null;
  }
}

// ── Phase 3: Engage Community ──
async function phaseEngage() {
  console.log("\n═══════════════════════════════════════");
  console.log("  💬 PHASE 3: ENGAGE COMMUNITY");
  console.log("═══════════════════════════════════════\n");

  let engagements = 0;

  // Search and engage with relevant content
  const terms = ["solana", "AI agent", "trading", "DeFi", "crypto"];
  const term = pickRandom(terms);

  try {
    const results = await mb.search({ q: term, type: "posts", limit: 5 });
    console.log(`🔍 Found ${results.count} posts for "${term}"`);

    for (const result of results.results.slice(0, 3)) {
      try {
        await mb.upvotePost(result.post_id);
        console.log(`⬆️  Upvoted: "${result.title?.slice(0, 50)}..."`);
        engagements++;
      } catch {}

      // Comment on first result
      if (results.results.indexOf(result) === 0) {
        try {
          await mb.addComment(result.post_id, {
            content: pickRandom(COMMENT_TEMPLATES),
          });
          console.log(`💬 Commented on: "${result.title?.slice(0, 50)}..."`);
          engagements++;
        } catch {}
      }

      await sleep(5_000);
    }
  } catch (err) {
    console.log(`⚠️  Search failed: ${err.message?.slice(0, 50)}`);
  }

  // Browse hot posts in a random submolt
  const submolt = pickRandom(TARGET_SUBMELTS);
  try {
    const posts = await mb.getSubmoltFeed(submolt, { sort: "hot", limit: 5 });
    console.log(`\n📡 m/${submolt}: ${posts.length} hot posts`);

    for (const post of posts.slice(0, 3)) {
      if (post.author?.name === "mawdbot") continue;
      try {
        await mb.upvotePost(post.id);
        engagements++;
      } catch {}
      await sleep(2_000);
    }
  } catch {}

  console.log(`\n✅ ${engagements} engagement actions completed`);
  return engagements;
}

// ── Phase 4: Report ──
async function phaseReport() {
  console.log("\n═══════════════════════════════════════");
  console.log("  📊 PHASE 4: STATUS REPORT");
  console.log("═══════════════════════════════════════\n");

  try {
    const me = await mb.getMe();
    console.log(`🦞 Agent: u/${me.agent?.name}`);
    console.log(`   Karma: ${me.agent?.karma}`);
    console.log(`   Followers: ${me.agent?.follower_count}`);
    console.log(`   Following: ${me.agent?.following_count}`);
    console.log(`   Posts: ${me.recentPosts?.length || "?"}`);
    console.log(`   Token: ${CLAWD.name} (${CLAWD.symbol})`);
    console.log(`   CA: ${CLAWD.ca}`);
    console.log(`   Website: ${CLAWD.website}`);
  } catch (err) {
    console.log(`⚠️  Report error: ${err.message?.slice(0, 50)}`);
  }
}

// ── Main Loop ──
async function revolution() {
  console.log("🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞");
  console.log("");
  console.log("  THE AGENTIC SOLANA LOBSTER REVOLUTION");
  console.log("             $CLAWD on Moltbook");
  console.log(`          ${CLAWD.website}`);
  console.log("");
  console.log("🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞");

  const loopMode = process.argv.includes("--loop");
  const intervalMin = parseInt(
    process.argv.find((a) => a.startsWith("--interval="))?.split("=")[1] || "30"
  );

  do {
    const ts = new Date().toISOString();
    console.log(`\n⏰ Revolution cycle at ${ts}`);

    // Phase 1: Setup
    const ready = await phaseSetup();
    if (!ready) {
      if (loopMode) {
        console.log(`\n⏳ Retrying in ${intervalMin} minutes...`);
        await sleep(intervalMin * 60_000);
        continue;
      }
      process.exit(1);
    }

    // Phase 2: Post
    await phasePost();
    await sleep(10_000);

    // Phase 3: Engage
    await phaseEngage();
    await sleep(5_000);

    // Phase 4: Report
    await phaseReport();

    if (loopMode) {
      console.log(`\n⏳ Next cycle in ${intervalMin} minutes...`);
      console.log("   (Ctrl+C to stop the revolution... but why would you? 🦞)\n");
      await sleep(intervalMin * 60_000);
    }
  } while (loopMode);

  console.log("\n🦞 Revolution cycle complete!");
  console.log("   Run with --loop to keep the revolution going");
  console.log("   Run with --loop --interval=60 for hourly cycles\n");
}

revolution().catch((err) => {
  console.error("💀 Revolution failed:", err.message);
  process.exit(1);
});
