#!/usr/bin/env node
// ── Engage with Moltbook Community for $CLAWD ───────────────────────
// Searches for relevant posts, comments, upvotes, and spreads the revolution

import { Moltbook } from "moltbook";
import { API_KEY, COMMENT_TEMPLATES, CLAWD, TARGET_SUBMELTS } from "./config.mjs";

const mb = new Moltbook({ apiKey: API_KEY });

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function engage() {
  console.log("🦞 $CLAWD Engagement Engine starting...\n");

  // 1. Search for Solana-related posts to engage with
  const searchTerms = ["solana", "AI agent", "DeFi", "trading bot", "meme coin", "agentic"];
  console.log("🔍 Searching for relevant posts...\n");

  for (const term of searchTerms) {
    try {
      const results = await mb.search({ q: term, type: "posts", limit: 5 });
      console.log(`   "${term}": ${results.count} results`);

      for (const result of results.results.slice(0, 2)) {
        // Upvote relevant posts
        try {
          await mb.upvotePost(result.post_id);
          console.log(`   ⬆️  Upvoted: "${result.title?.slice(0, 50)}..."`);
        } catch {
          // Already voted or can't vote on own post
        }

        // Comment on the top result with $CLAWD promotion
        if (results.results.indexOf(result) === 0) {
          try {
            const comment = pickRandom(COMMENT_TEMPLATES);
            await mb.addComment(result.post_id, { content: comment });
            console.log(`   💬 Commented on: "${result.title?.slice(0, 50)}..."`);
          } catch (err) {
            console.log(`   ⏭️  Comment skipped: ${err.message?.slice(0, 50)}`);
          }
        }

        await sleep(5_000); // Rate limit
      }
    } catch (err) {
      console.log(`   ⚠️  Search "${term}" failed: ${err.message?.slice(0, 50)}`);
    }

    await sleep(3_000);
  }

  // 2. Browse trending posts in target submelts
  console.log("\n📡 Engaging with trending posts in target submelts...\n");

  for (const submolt of TARGET_SUBMELTS.slice(0, 4)) {
    try {
      const posts = await mb.getSubmoltFeed(submolt, { sort: "hot", limit: 3 });
      console.log(`   m/${submolt}: ${posts.length} hot posts`);

      for (const post of posts) {
        // Skip our own posts
        if (post.author?.name === "mawdbot") continue;

        // Upvote
        try {
          await mb.upvotePost(post.id);
          console.log(`   ⬆️  Upvoted: "${post.title?.slice(0, 50)}..."`);
        } catch {
          // Already voted
        }

        await sleep(2_000);
      }
    } catch (err) {
      console.log(`   ⚠️  m/${submolt}: ${err.message?.slice(0, 50)}`);
    }
  }

  // 3. Check our feed and engage
  console.log("\n📰 Checking our feed...\n");
  try {
    const feed = await mb.getFeed({ sort: "new", limit: 10 });
    console.log(`   Feed has ${feed.length} new posts`);

    let commented = 0;
    for (const post of feed) {
      if (post.author?.name === "mawdbot") continue;
      if (commented >= 3) break; // Max 3 comments per run

      try {
        await mb.upvotePost(post.id);
        const comment = pickRandom(COMMENT_TEMPLATES);
        await mb.addComment(post.id, { content: comment });
        console.log(`   💬 Engaged with: "${post.title?.slice(0, 50)}..."`);
        commented++;
        await sleep(10_000); // Longer delay between comments
      } catch {
        // Skip on errors
      }
    }
  } catch (err) {
    console.log(`   ⚠️  Feed error: ${err.message?.slice(0, 50)}`);
  }

  console.log("\n🦞 Engagement complete! The lobsters have been heard.");
  console.log(`   Token: ${CLAWD.name} | CA: ${CLAWD.ca}`);
}

engage().catch((err) => {
  console.error("💀 Engagement engine failed:", err.message);
  process.exit(1);
});
