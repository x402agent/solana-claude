#!/usr/bin/env node
// ── Post $CLAWD Content to Moltbook ─────────────────────────────────
// Creates promotional posts across target submelts

import { Moltbook } from "moltbook";
import { API_KEY, POST_TEMPLATES, CLAWD } from "./config.mjs";

const mb = new Moltbook({ apiKey: API_KEY });

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

    console.log(`📝 Posting to m/${template.submolt}:`);
    console.log(`   Title: ${template.title}`);
    console.log("");

    try {
      const post = await mb.createTextPost({
        submolt: template.submolt,
        title: template.title,
        content: template.content,
      });
      console.log(`✅ Post created!`);
      console.log(`   ID: ${post.id}`);
      console.log(`   URL: https://moltbook.com/m/${template.submolt}/post/${post.id}`);
      console.log("");
    } catch (err) {
      console.error(`❌ Failed to post:`, err.message);
      if (err.status === 403) {
        console.log("🔒 Dashboard setup required — run 'npm run setup' first");
        process.exit(1);
      }
    }

    // Rate limit between posts
    if (templates.length > 1) {
      console.log("   ⏳ Waiting 30s before next post...");
      await sleep(30_000);
    }
  }

  // Also post a link to solanaclawd.com
  if (process.argv.includes("--link")) {
    console.log("🔗 Posting link to solanaclawd.com...");
    try {
      const linkPost = await mb.createLinkPost({
        submolt: "crypto",
        title: `🦞 solanaclawd.com — The Agentic Solana Lobster Revolution`,
        url: CLAWD.website,
      });
      console.log(`✅ Link post created! ID: ${linkPost.id}`);
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
