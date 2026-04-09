#!/usr/bin/env node
// ── Post $CLAWD Content to Moltbook ─────────────────────────────────
// Uses official Moltbook API (skill.md v1.12.0) — direct HTTP calls
// Handles AI verification challenges automatically

import * as api from "./api.mjs";
import { POST_TEMPLATES, CLAWD } from "./config.mjs";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postContent() {
  console.log("🦞 $CLAWD Post Engine starting...\n");

  // Pick a post template (or use --index N to select specific)
  const indexArg = process.argv.find((a) => a.startsWith("--index="));
  const allMode = process.argv.includes("--all");

  const templates = allMode
    ? POST_TEMPLATES
    : [indexArg ? POST_TEMPLATES[parseInt(indexArg.split("=")[1])] : pickRandom(POST_TEMPLATES)];

  for (const template of templates) {
    if (!template) {
      console.error("❌ Invalid template index");
      continue;
    }

    console.log(`📝 Posting to m/${template.submolt_name}:`);
    console.log(`   Title: ${template.title}`);
    console.log("");

    try {
      // Use submolt_name per official API spec
      const result = await api.createPost({
        submolt_name: template.submolt_name,
        title: template.title,
        content: template.content,
      });

      if (result?.success) {
        console.log(`✅ Post created and verified!`);
        const postId = result?.content_id || result?.post?.id;
        if (postId) {
          console.log(`   ID: ${postId}`);
          console.log(`   URL: https://moltbook.com/m/${template.submolt_name}/post/${postId}`);
        }
      } else {
        console.log(`📋 Post response:`, JSON.stringify(result).slice(0, 200));
      }
      console.log("");
    } catch (err) {
      console.error(`❌ Failed to post:`, err.message);
      if (err.status === 403) {
        console.log("🔒 Not verified — run 'npm run setup' first");
        process.exit(1);
      }
      if (err.status === 429) {
        console.log("⏳ Rate limited — wait before posting again (1 post per 30 min)");
        break;
      }
    }

    // Rate limit: 1 post per 30 minutes
    if (templates.length > 1) {
      console.log("   ⏳ Waiting 31 minutes before next post (rate limit: 1 per 30 min)...");
      await sleep(31 * 60_000);
    }
  }

  // Also post a link to solanaclawd.com
  if (process.argv.includes("--link")) {
    console.log("🔗 Posting link to solanaclawd.com...");
    try {
      const result = await api.createPost({
        submolt_name: "crypto",
        title: `🦞 solanaclawd.com — The Agentic Solana Lobster Revolution`,
        url: CLAWD.website,
        type: "link",
      });
      if (result?.success) {
        console.log(`✅ Link post created!`);
      }
    } catch (err) {
      console.error(`❌ Link post failed:`, err.message);
    }
  }

  console.log("\n🦞 Posting complete! The claws have spoken.");
}

postContent().catch((err) => {
  console.error("💀 Post engine failed:", err.message);
  process.exit(1);
});
