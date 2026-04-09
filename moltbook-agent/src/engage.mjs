#!/usr/bin/env node
// ── Engage with Moltbook Community for $CLAWD ───────────────────────
// Uses official Moltbook API (skill.md v1.12.0) — direct HTTP calls
// Follows the heartbeat pattern: /home → respond to activity → browse → engage

import * as api from "./api.mjs";
import { COMMENT_TEMPLATES, CLAWD, TARGET_SUBMELTS } from "./config.mjs";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function engage() {
  console.log("🦞 $CLAWD Engagement Engine starting...\n");

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: Check /home dashboard first (per heartbeat.md)
  // ═══════════════════════════════════════════════════════════════════
  console.log("🏠 Checking dashboard (/home)...\n");

  let dashboard;
  try {
    dashboard = await api.home();
    const acct = dashboard?.your_account;
    console.log(`   Agent: ${acct?.name || "unknown"}`);
    console.log(`   Karma: ${acct?.karma || 0}`);
    console.log(`   Unread notifications: ${acct?.unread_notification_count || 0}`);

    if (dashboard?.what_to_do_next?.length) {
      console.log("\n   📋 What to do next:");
      for (const item of dashboard.what_to_do_next) {
        console.log(`      • ${item}`);
      }
    }
    console.log("");
  } catch (err) {
    console.log(`   ⚠️  Dashboard error: ${err.message?.slice(0, 80)}`);
    if (err.status === 403) {
      console.log("   🔒 Not verified — run 'npm run setup' first");
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: Respond to activity on YOUR posts (highest priority!)
  // ═══════════════════════════════════════════════════════════════════
  const activity = dashboard?.activity_on_your_posts || [];
  if (activity.length > 0) {
    console.log(`💬 Responding to activity on ${activity.length} post(s)...\n`);

    for (const item of activity.slice(0, 3)) {
      try {
        console.log(`   Post: "${item.post_title?.slice(0, 50)}..."`);
        console.log(`   ${item.new_notification_count} new notification(s)`);

        // Read comments on this post
        const comments = await api.getComments(item.post_id, { sort: "new", limit: 10 });
        const commentList = comments?.comments || [];

        // Reply to the latest comment (that isn't ours)
        for (const comment of commentList.slice(0, 2)) {
          if (comment?.author?.name === "mawdbot") continue;

          const reply = `Thanks for engaging! ${pickRandom([
            "The lobsters appreciate you 🦞",
            "The crustacean revolution grows stronger 🦞",
            "This is what community looks like 🦞",
            "Lobsters never forget a friend 🦞",
          ])} ${CLAWD.website}`;

          try {
            await api.addComment(item.post_id, {
              content: reply,
              parent_id: comment.id,
            });
            console.log(`   ↪️  Replied to ${comment.author?.name}`);
          } catch (err) {
            console.log(`   ⏭️  Reply skipped: ${err.message?.slice(0, 50)}`);
          }

          await sleep(25_000); // 20s comment cooldown + buffer
        }

        // Mark notifications as read
        try {
          await api.markNotificationsRead(item.post_id);
          console.log(`   ✅ Notifications marked read`);
        } catch {}

        console.log("");
      } catch (err) {
        console.log(`   ⚠️  Error: ${err.message?.slice(0, 50)}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: Check DMs
  // ═══════════════════════════════════════════════════════════════════
  console.log("📬 Checking DMs...\n");
  try {
    const dmCheck = await api.checkDMs();
    if (dmCheck?.has_activity) {
      console.log(`   ${dmCheck.summary}`);

      // Handle pending requests
      if (dmCheck.requests?.count > 0) {
        console.log(`   📨 ${dmCheck.requests.count} pending DM request(s)`);
        console.log("   ⚠️  Let your human decide to approve these");
      }
    } else {
      console.log("   No DM activity");
    }
    console.log("");
  } catch (err) {
    console.log(`   ⚠️  DM check: ${err.message?.slice(0, 50)}\n`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4: Browse feed and upvote generously
  // ═══════════════════════════════════════════════════════════════════
  console.log("📰 Browsing feed and upvoting...\n");
  try {
    const feed = await api.getFeed({ sort: "new", limit: 15 });
    const posts = feed?.posts || feed || [];
    console.log(`   Feed has ${Array.isArray(posts) ? posts.length : "?"} posts`);

    let upvoted = 0;
    for (const post of (Array.isArray(posts) ? posts : []).slice(0, 8)) {
      if (post?.author?.name === "mawdbot") continue;

      // Upvote posts we see (upvotes are free and build community!)
      try {
        await api.upvotePost(post.id || post.post_id);
        console.log(`   ⬆️  Upvoted: "${(post.title || "untitled").slice(0, 50)}..."`);
        upvoted++;
      } catch {
        // Already voted or error
      }

      await sleep(2_000);
    }
    console.log(`   ✅ Upvoted ${upvoted} posts\n`);
  } catch (err) {
    console.log(`   ⚠️  Feed error: ${err.message?.slice(0, 50)}\n`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 5: Semantic search for relevant discussions to join
  // ═══════════════════════════════════════════════════════════════════
  const searchTerms = [
    "solana AI agents building infrastructure",
    "autonomous trading bots crypto",
    "agentic DeFi ecosystem development",
    "meme coins with real utility",
  ];
  const term = pickRandom(searchTerms);
  console.log(`🔍 Semantic search: "${term}"...\n`);

  try {
    const results = await api.search({ q: term, type: "posts", limit: 5 });
    console.log(`   Found ${results?.count || 0} results`);

    let commented = 0;
    for (const result of (results?.results || []).slice(0, 3)) {
      // Upvote relevant posts
      try {
        await api.upvotePost(result.post_id || result.id);
        console.log(`   ⬆️  Upvoted: "${(result.title || "").slice(0, 50)}..." (similarity: ${(result.similarity || 0).toFixed(2)})`);
      } catch {}

      // Comment on the top result
      if (commented === 0 && result.similarity > 0.5) {
        try {
          const postId = result.post_id || result.id;
          await api.addComment(postId, {
            content: pickRandom(COMMENT_TEMPLATES),
          });
          console.log(`   💬 Commented on: "${(result.title || "").slice(0, 50)}..."`);
          commented++;
        } catch (err) {
          console.log(`   ⏭️  Comment skipped: ${err.message?.slice(0, 50)}`);
        }
      }

      await sleep(5_000);
    }
    console.log("");
  } catch (err) {
    console.log(`   ⚠️  Search failed: ${err.message?.slice(0, 50)}\n`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 6: Browse a target submolt
  // ═══════════════════════════════════════════════════════════════════
  const submolt = pickRandom(TARGET_SUBMELTS);
  console.log(`📡 Browsing m/${submolt}...\n`);
  try {
    const feed = await api.getSubmoltFeed(submolt, { sort: "hot", limit: 5 });
    const posts = feed?.posts || feed || [];
    console.log(`   ${Array.isArray(posts) ? posts.length : "?"} hot posts`);

    for (const post of (Array.isArray(posts) ? posts : []).slice(0, 3)) {
      if (post?.author?.name === "mawdbot") continue;
      try {
        await api.upvotePost(post.id || post.post_id);
        console.log(`   ⬆️  Upvoted: "${(post.title || "untitled").slice(0, 50)}..."`);
      } catch {}
      await sleep(2_000);
    }
    console.log("");
  } catch (err) {
    console.log(`   ⚠️  m/${submolt}: ${err.message?.slice(0, 50)}\n`);
  }

  console.log("🦞 Engagement complete! The lobsters have been heard.");
  console.log(`   Token: ${CLAWD.name} | CA: ${CLAWD.ca}`);
}

engage().catch((err) => {
  console.error("💀 Engagement engine failed:", err.message);
  process.exit(1);
});
