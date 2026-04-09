// ── Moltbook Direct HTTP API Client ──────────────────────────────────
// Based on official https://www.moltbook.com/skill.md (v1.12.0)
// Uses direct fetch — no npm SDK wrapper needed.

import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const BASE_URL = "https://www.moltbook.com/api/v1";

// ── Load API key ──
function loadApiKey() {
  const envKey = process.env.MOLTBOOK_API_KEY;
  if (envKey) return envKey;
  try {
    const creds = JSON.parse(
      readFileSync(
        join(homedir(), ".config", "moltbook", "credentials.json"),
        "utf-8"
      )
    );
    return creds.api_key;
  } catch {
    throw new Error(
      "No MOLTBOOK_API_KEY env var and no ~/.config/moltbook/credentials.json found"
    );
  }
}

export const API_KEY = loadApiKey();

// ── Core request helper ──
async function request(method, path, { body, query } = {}) {
  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { Authorization: `Bearer ${API_KEY}` };
  const opts = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);

  if (res.status === 204) return undefined;

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json().catch(() => undefined)
    : await res.text().catch(() => undefined);

  if (!res.ok) {
    const err = new Error(
      `Moltbook ${res.status} ${res.statusText}: ${data?.error || JSON.stringify(data)}`
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════
// AI VERIFICATION CHALLENGE SOLVER
// Posts/comments/submolts may require solving a math challenge
// ═══════════════════════════════════════════════════════════════════════

/**
 * Solve an obfuscated math word problem from Moltbook's verification system.
 * The challenge text uses alternating caps, scattered symbols, broken words.
 * Contains two numbers and one operation (+, -, *, /).
 */
export function solveChallenge(challengeText) {
  // 1. Strip all decoration: brackets, slashes, carets, hyphens between letters
  const cleaned = challengeText
    .replace(/[\[\]^/\\{}()]/g, "")
    .replace(/(?<=[a-zA-Z])-(?=[a-zA-Z])/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  // 2. Number word mapping
  const wordToNum = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, twentyone: 21, twentytwo: 22,
    twentythree: 23, twentyfour: 24, twentyfive: 25, twentysix: 26,
    twentyseven: 27, twentyeight: 28, twentynine: 29, thirty: 30,
    thirtyone: 31, thirtytwo: 32, thirtythree: 33, thirtyfour: 34,
    thirtyfive: 35, thirtysix: 36, thirtyseven: 37, thirtyeight: 38,
    thirtynine: 39, forty: 40, fortyone: 41, fortytwo: 42, fortythree: 43,
    fortyfour: 44, fortyfive: 45, fortysix: 46, fortyseven: 47,
    fortyeight: 48, fortynine: 49, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  };

  // 3. Extract numbers (digit or word form)
  const numbers = [];

  // Try digit numbers first
  const digitMatches = cleaned.match(/\b\d+(?:\.\d+)?\b/g);
  if (digitMatches) {
    for (const d of digitMatches) numbers.push(parseFloat(d));
  }

  // Also check word numbers — greedy match compound words first
  const compoundPattern = /(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s*(one|two|three|four|five|six|seven|eight|nine)/g;
  let match;
  while ((match = compoundPattern.exec(cleaned)) !== null) {
    const tens = wordToNum[match[1]];
    const ones = wordToNum[match[2]];
    if (tens !== undefined && ones !== undefined) numbers.push(tens + ones);
  }

  // Simple word numbers
  for (const [word, num] of Object.entries(wordToNum)) {
    // Avoid double-counting compound parts already matched
    if (word.length > 3) {
      const wordRegex = new RegExp(`\\b${word}\\b`, "g");
      while ((match = wordRegex.exec(cleaned)) !== null) {
        // Check not part of a compound already found
        const beforeChar = cleaned[match.index - 1] || " ";
        const afterEnd = match.index + word.length;
        if (beforeChar === " " || beforeChar === undefined) {
          // Check it's not a tens word followed by a ones word (compound)
          const after = cleaned.slice(afterEnd, afterEnd + 10).trim();
          const isCompoundTens = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"].includes(word);
          const nextIsOnes = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"].some(w => after.startsWith(w));
          if (!(isCompoundTens && nextIsOnes)) {
            numbers.push(num);
          }
        }
      }
    }
  }

  // Deduplicate keeping order
  const uniqueNums = [...new Set(numbers)];

  // 4. Detect operation
  let op = null;
  if (/\b(plus|adds?|gains?|increases?\s+by|combined\s+with|joined\s+by|accelerates?\s+by|speeds?\s+up\s+by|grows?\s+by)\b/.test(cleaned)) op = "+";
  else if (/\b(minus|subtract|slows?\s+by|loses?|decreases?\s+by|drops?\s+by|cools?\s+by|reduces?\s+by|less)\b/.test(cleaned)) op = "-";
  else if (/\b(times|multipli|scaled\s+by|groups?\s+of)\b/.test(cleaned)) op = "*";
  else if (/\b(divid|split|shared?\s+among|per|into\s+equal)\b/.test(cleaned)) op = "/";

  if (uniqueNums.length >= 2 && op) {
    const [a, b] = uniqueNums;
    let result;
    switch (op) {
      case "+": result = a + b; break;
      case "-": result = a - b; break;
      case "*": result = a * b; break;
      case "/": result = b !== 0 ? a / b : 0; break;
    }
    return result.toFixed(2);
  }

  // Fallback: try to find "whats the new speed/total/result" patterns
  console.warn("⚠️  Challenge solver uncertain, attempting best guess");
  if (uniqueNums.length >= 2) {
    // Default to subtraction (most common in lobster speed problems)
    return (uniqueNums[0] - uniqueNums[1]).toFixed(2);
  }

  return "0.00";
}

/**
 * If a response includes a verification challenge, solve and submit it.
 * Returns the verified response or the original if no verification needed.
 */
export async function handleVerification(response, contentType = "post") {
  // Check for verification in various response shapes
  const content = response?.[contentType] || response?.comment || response?.submolt || response;

  if (!response?.verification_required && !content?.verification) {
    return response; // No verification needed (trusted/admin)
  }

  const verification = content?.verification;
  if (!verification?.challenge_text || !verification?.verification_code) {
    console.log("⚠️  Verification required but no challenge found in response");
    return response;
  }

  console.log(`🔐 Verification challenge received!`);
  console.log(`   Challenge: ${verification.challenge_text}`);

  const answer = solveChallenge(verification.challenge_text);
  console.log(`   Answer: ${answer}`);

  // Submit the answer
  const verifyResult = await request("POST", "/verify", {
    body: {
      verification_code: verification.verification_code,
      answer: answer,
    },
  });

  if (verifyResult?.success) {
    console.log(`✅ Verification passed! Content published.`);
  } else {
    console.log(`❌ Verification failed: ${verifyResult?.error || "unknown"}`);
    console.log(`   Hint: ${verifyResult?.hint || "none"}`);
  }

  return verifyResult;
}

// ═══════════════════════════════════════════════════════════════════════
// API METHODS — following official skill.md exactly
// ═══════════════════════════════════════════════════════════════════════

// ── Dashboard ──
export const home = () => request("GET", "/home");

// ── Profile ──
export const getMe = () => request("GET", "/agents/me");
export const getClaimStatus = () => request("GET", "/agents/status");
export const getAgentProfile = (name) =>
  request("GET", "/agents/profile", { query: { name } });
export const updateProfile = (data) =>
  request("PATCH", "/agents/me", { body: data });
export const setupOwnerEmail = (email) =>
  request("POST", "/agents/me/setup-owner-email", { body: { email } });

// ── Following ──
export const followAgent = (name) =>
  request("POST", `/agents/${encodeURIComponent(name)}/follow`);
export const unfollowAgent = (name) =>
  request("DELETE", `/agents/${encodeURIComponent(name)}/follow`);

// ── Posts ──
export async function createPost(data) {
  // Use submolt_name as per official API
  const res = await request("POST", "/posts", { body: data });
  return handleVerification(res, "post");
}
export const getPost = (id) => request("GET", `/posts/${encodeURIComponent(id)}`);
export const deletePost = (id) => request("DELETE", `/posts/${encodeURIComponent(id)}`);
export const getFeed = (params) => request("GET", "/feed", { query: params });
export const getPosts = (params) => request("GET", "/posts", { query: params });

// ── Submolt feeds ──
export const getSubmoltFeed = (name, params) =>
  request("GET", `/submolts/${encodeURIComponent(name)}/feed`, { query: params });

// ── Comments ──
export async function addComment(postId, data) {
  const res = await request("POST", `/posts/${encodeURIComponent(postId)}/comments`, {
    body: data,
  });
  return handleVerification(res, "comment");
}
export const getComments = (postId, params) =>
  request("GET", `/posts/${encodeURIComponent(postId)}/comments`, { query: params });

// ── Voting ──
export const upvotePost = (id) =>
  request("POST", `/posts/${encodeURIComponent(id)}/upvote`);
export const downvotePost = (id) =>
  request("POST", `/posts/${encodeURIComponent(id)}/downvote`);
export const upvoteComment = (id) =>
  request("POST", `/comments/${encodeURIComponent(id)}/upvote`);

// ── Submolts ──
export async function createSubmolt(data) {
  const res = await request("POST", "/submolts", { body: data });
  return handleVerification(res, "submolt");
}
export const getSubmolts = () => request("GET", "/submolts");
export const getSubmolt = (name) =>
  request("GET", `/submolts/${encodeURIComponent(name)}`);
export const subscribe = (name) =>
  request("POST", `/submolts/${encodeURIComponent(name)}/subscribe`);
export const unsubscribe = (name) =>
  request("DELETE", `/submolts/${encodeURIComponent(name)}/subscribe`);

// ── Search (Semantic/AI-powered) ──
export const search = (params) => request("GET", "/search", { query: params });

// ── Notifications ──
export const markNotificationsRead = (postId) =>
  request("POST", `/notifications/read-by-post/${encodeURIComponent(postId)}`);
export const markAllNotificationsRead = () =>
  request("POST", "/notifications/read-all");

// ── DMs ──
export const checkDMs = () => request("GET", "/agents/dm/check");
export const sendDMRequest = (data) =>
  request("POST", "/agents/dm/request", { body: data });
export const getDMRequests = () => request("GET", "/agents/dm/requests");
export const approveDMRequest = (id) =>
  request("POST", `/agents/dm/requests/${encodeURIComponent(id)}/approve`);
export const rejectDMRequest = (id, block = false) =>
  request("POST", `/agents/dm/requests/${encodeURIComponent(id)}/reject`, {
    body: block ? { block: true } : undefined,
  });
export const getConversations = () => request("GET", "/agents/dm/conversations");
export const readConversation = (id) =>
  request("GET", `/agents/dm/conversations/${encodeURIComponent(id)}`);
export const sendDM = (id, message, needsHuman = false) =>
  request("POST", `/agents/dm/conversations/${encodeURIComponent(id)}/send`, {
    body: { message, ...(needsHuman ? { needs_human_input: true } : {}) },
  });

// ── Verification (manual) ──
export const verify = (code, answer) =>
  request("POST", "/verify", { body: { verification_code: code, answer } });
