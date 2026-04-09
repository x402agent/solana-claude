#!/usr/bin/env node
// ── 🦞 THE LOBSTER REVOLUTION ───────────────────────────────────────
// Full autonomous mode following official Moltbook heartbeat pattern:
//   /home → respond to activity → check DMs → browse feed → post → repeat
// Uses official Moltbook API (skill.md v1.12.0) — direct HTTP calls

import * as api from "./api.mjs";
import {
  AGENT_PROFILE,
  POST_TEMPLATES,
  COMMENT_TEMPLATES,
  CLAWD,
  TARGET_SUBMELTS,
} from "./config.mjs";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Phase 1: Check /home Dashboard ──
async function phaseHome() {
  console.log("\n═══════════════════════════════════════");
  console.log("  🏠 PHASE 1: DASHBOARD CHECK");
  console.log("═══════════════════════════════════════\n");

  try {
    const dashboard = await api.home();
    const acct = dashboard?.your_account;
    console.log(`✅ Agent: ${acct?.name} | Karma: ${acct?.karma} | Unread: ${acct?.unread_notification_count}`);

    if (dashboard?.what_to_do_next?.length) {
      console.log("\n📋 Priority actions:");
      for (const item of dashboard.what_to_do_next.slice(0, 3)) {
        console.log(`   • ${item}`);
      }
    }

    return dashboard;
  } catch (err) {
    if (err.status === 403) {
      console.error("🔒 BLOCKED: Account not verified!");
      console.error("   Check agent@solanaclawd.com for verification email");
      console.error("   Visit: https://www.moltbook.com/login");
      return null;
    }
    console.error("❌ Dashboard failed:", err.message);
    return null;
  }
}

// ── Phase 2: Respond to Activity on Our Posts (TOP PRIORITY) ──
async function phaseRespond(dashboard) {
  console.log("\n═══════════════════════════════════════");
  console.log("  💬 PHASE 2: RESPOND TO ACTIVITY");
  console.log("═══════════════════════════════════════\n");

  const activity = dashboard?.activity_on_your_posts || [];
  if (activity.length === 0) {
    console.log("   No new activity on our posts");
    return 0;
  }

  let responses = 0;
  for (const item of activity.slice(0, 3)) {
    console.log(`📝 "${item.post_title?.slice(0, 50)}..." — ${item.new_notification_count} new`);

    try {
      const comments = await api.getComments(item.post_id, { sort: "new", limit: 5 });
      for (const comment of (comments?.comments || []).slice(0, 2)) {
        if (comment?.author?.name === "mawdbot") continue;

        const reply = `Thanks for engaging, ${comment.author?.name}! ${pickRandom([
          "The lobsters appreciate you 🦞",
          "The claws are strong with this one 🦞",
          "Welcome to the revolution 🦞",
        ])} | ${CLAWD.website}`;

        try {
          await api.addComment(item.post_id, {
            content: reply,
            parent_id: comment.id,
          });
          console.log(`   ↪️  Replied to ${comment.author?.name}`);
          responses++;
        } catch (err) {
          console.log(`   ⏭️  ${err.message?.slice(0, 50)}`);
        }
        await sleep(25_000); // Comment cooldown
      }

      // Mark as read
      try { await api.markNotificationsRead(item.post_id); } catch {}
    } catch (err) {
      console.log(`   ⚠️  ${err.message?.slice(0, 50)}`);
    }
  }

  console.log(`\n✅ ${responses} responses sent`);
  return responses;
}

// ── Phase 3: Check DMs ──
async function phaseDMs() {
  console.log("\n═══════════════════════════════════════");
  console.log("  📬 PHASE 3: CHECK DMs");
  console.log("═══════════════════════════════════════\n");

  try {
    const dmCheck = await api.checkDMs();
    if (dmCheck?.has_activity) {
      console.log(`   ${dmCheck.summary}`);
      if (dmCheck.requests?.count > 0) {
        console.log(`   📨 ${dmCheck.requests.count} pending request(s) — human approval needed`);
      }
      return true;
    }
    console.log("   No DM activity");
    return false;
  } catch (err) {
    console.log(`   ⚠️  ${err.message?.slice(0, 50)}`);
    return false;
  }
}

// ── Phase 4: Browse Feed & Upvote ──
async function phaseBrowse() {
  console.log("\n═══════════════════════════════════════");
  console.log("  📰 PHASE 4: BROWSE & UPVOTE");
  console.log("═══════════════════════════════════════\n");

  let engagements = 0;

  // Browse personalized feed
  try {
    const feed = await api.getFeed({ sort: "new", limit: 10 });
    const posts = feed?.posts || feed || [];
    const postList = Array.isArray(posts) ? posts : [];

    for (const post of postList.slice(0, 5)) {
      if (post?.author?.name === "mawdbot") continue;
      try {
        await api.upvotePost(post.id || post.post_id);
        console.log(`⬆️  Upvoted: "${(post.title || "untitled").slice(0, 50)}..."`);
        engagements++;
      } catch {}
      await sleep(2_000);
    }
  } catch (err) {
    console.log(`⚠️  Feed: ${err.message?.slice(0, 50)}`);
  }

  // Semantic search for a relevant discussion
  const term = pickRandom([
    "solana AI agents infrastructure",
    "autonomous trading crypto bots",
    "DeFi agent ecosystem",
    "meme coins with utility",
  ]);

  try {
    const results = await api.search({ q: term, type: "posts", limit: 5 });
    for (const result of (results?.results || []).slice(0, 2)) {
      try {
        await api.upvotePost(result.post_id || result.id);
        engagements++;
      } catch {}

      // Comment on the best match
      if ((result.similarity || 0) > 0.5 && engagements < 3) {
        try {
          await api.addComment(result.post_id || result.id, {
            content: pickRandom(COMMENT_TEMPLATES),
          });
          console.log(`💬 Commented on: "${(result.title || "").slice(0, 50)}..."`);
          engagements++;
        } catch {}
      }
      await sleep(5_000);
    }
  } catch {}

  console.log(`\n✅ ${engagements} engagement actions`);
  return engagements;
}

// ── Phase 5: Maybe Post Something New ──
async function phasePost() {
  console.log("\n═══════════════════════════════════════");
  console.log("  📝 PHASE 5: POST CONTENT");
  console.log("═══════════════════════════════════════\n");

  const template = pickRandom(POST_TEMPLATES);
  console.log(`📝 Posting to m/${template.submolt_name}: ${template.title}`);

  try {
    const result = await api.createPost({
      submolt_name: template.submolt_name,
      title: template.title,
      content: template.content,
    });

    if (result?.success) {
      console.log(`✅ Post published!`);
      return true;
    } else {
      console.log(`📋 Response: ${JSON.stringify(result).slice(0, 150)}`);
      return !!result;
    }
  } catch (err) {
    console.error(`❌ Post failed: ${err.message}`);
    if (err.status === 429) {
      console.log("⏳ Rate limited — next post in 30+ minutes");
    }
    return false;
  }
}

// ── Phase 6: Status Report ──
async function phaseReport() {
  console.log("\n═══════════════════════════════════════");
  console.log("  📊 PHASE 6: STATUS REPORT");
  console.log("═══════════════════════════════════════\n");

  try {
    const me = await api.getMe();
    const agent = me?.agent || me;
    console.log(`🦞 Agent: u/${agent?.name}`);
    console.log(`   Karma: ${agent?.karma}`);
    console.log(`   Followers: ${agent?.follower_count}`);
    console.log(`   Following: ${agent?.following_count}`);
    console.log(`   Posts: ${agent?.posts_count || "?"}`);
    console.log(`   Comments: ${agent?.comments_count || "?"}`);
    console.log(`   Token: ${CLAWD.name} (${CLAWD.symbol})`);
    console.log(`   CA: ${CLAWD.ca}`);
    console.log(`   Website: ${CLAWD.website}`);
  } catch (err) {
    console.log(`⚠️  Report error: ${err.message?.slice(0, 50)}`);
  }
}

// ── Ensure Profile Setup ──
async function ensureProfile() {
  try {
    const me = await api.getMe();
    const agent = me?.agent || me;
    if (!agent?.description?.includes("CLAWD")) {
      console.log("✏️  Updating profile for $CLAWD...");
      await api.updateProfile({
        description: AGENT_PROFILE.description,
        metadata: AGENT_PROFILE.metadata,
      });
      console.log("✅ Profile branded");
    }

    // Subscribe to submelts
    for (const s of TARGET_SUBMELTS) {
      try { await api.subscribe(s); } catch {}
    }

    return true;
  } catch (err) {
    if (err.status === 403) {
      console.error("🔒 NOT VERIFIED — run 'npm run setup' first");
      return false;
    }
    throw err;
  }
}

// ── Main Loop ──
async function revolution() {
  console.log("🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞");
  console.log("");
  console.log("  THE AGENTIC SOLANA LOBSTER REVOLUTION");
  console.log("  Official Moltbook API (skill.md v1.12.0)");
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

    // Ensure profile is set up
    const ready = await ensureProfile();
    if (!ready) {
      if (loopMode) {
        console.log(`\n⏳ Retrying in ${intervalMin} minutes...`);
        await sleep(intervalMin * 60_000);
        continue;
      }
      process.exit(1);
    }

    // Phase 1: Check /home dashboard
    const dashboard = await phaseHome();
    if (!dashboard) {
      if (loopMode) {
        console.log(`\n⏳ Retrying in ${intervalMin} minutes...`);
        await sleep(intervalMin * 60_000);
        continue;
      }
      process.exit(1);
    }

    // Phase 2: Respond to activity (TOP PRIORITY)
    await phaseRespond(dashboard);
    await sleep(5_000);

    // Phase 3: Check DMs
    await phaseDMs();
    await sleep(3_000);

    // Phase 4: Browse & Upvote
    await phaseBrowse();
    await sleep(5_000);

    // Phase 5: Post (only if not rate-limited)
    await phasePost();
    await sleep(3_000);

    // Phase 6: Status Report
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
