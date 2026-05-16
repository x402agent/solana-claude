import { createClient } from "@supabase/supabase-js";

// --- Config ---
const CONCURRENCY = 20;
const PAGE_SIZE = 100;
const MAX_RETRIES = 5;
const HEARTBEAT_MS = 20_000;
const PROGRESS_MS = 10_000;
const CHECKPOINT_MS = 30_000;
const MAX_ENRICHED_MINTS = 2000;
const MAX_WALLET_TXNS = 1_000_000;
const IDLE_SLEEP_MS = 2000;
const MAX_SLICES = 16;
const TARGET_CONCURRENT_CALLS = 80;
const RATE_LIMIT_PER_SEC = 90;
const GRACEFUL_SHUTDOWN_MS = 10_000; // time to finish current job before hard exit

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !HELIUS_API_KEY) {
  console.error("Missing required env vars: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HELIUS_API_KEY");
  process.exit(1);
}

const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Graceful shutdown state ---
let shuttingDown = false;
const activeJobs = new Set();

function handleSignal(signal) {
  if (shuttingDown) {
    console.warn(`[worker] ${signal} received again — forcing exit`);
    process.exit(1);
  }
  shuttingDown = true;
  console.warn(`[worker] ${signal} received — draining active jobs (max ${GRACEFUL_SHUTDOWN_MS}ms)`);
  setTimeout(() => {
    console.error(`[worker] Graceful shutdown timeout reached — forcing exit`);
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_MS);
}

process.on("SIGTERM", () => handleSignal("SIGTERM"));
process.on("SIGINT", () => handleSignal("SIGINT"));

// --- Rate Limiter ---

class RateLimiter {
  constructor(maxPerSecond) {
    this.maxTokens = maxPerSecond;
    this.tokens = maxPerSecond;
    this.lastRefill = Date.now();
    this.waitQueue = [];
  }

  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.maxTokens);
    this.lastRefill = now;
  }

  async acquire() {
    this._refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait until a token is available
    const waitMs = ((1 - this.tokens) / this.maxTokens) * 1000;
    await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitMs)));
    this._refill();
    this.tokens -= 1;
  }
}

const rateLimiter = new RateLimiter(RATE_LIMIT_PER_SEC);

// --- Helpers ---

function getAccountKeys(tx) {
  const msg = tx.transaction.message;
  if (msg.accountKeys) return msg.accountKeys;
  const keys = [...(msg.staticAccountKeys ?? [])];
  if (tx.meta?.loadedAddresses) {
    keys.push(...tx.meta.loadedAddresses.writable);
    keys.push(...tx.meta.loadedAddresses.readonly);
  }
  return keys;
}

async function rpcCall(method, params) {
  await rateLimiter.acquire();
  const res = await fetch(HELIUS_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

async function enrichMints(mintAddresses) {
  const BATCH_SIZE = 1000;
  const seen = new Set();
  const results = [];

  for (let i = 0; i < mintAddresses.length; i += BATCH_SIZE) {
    const batch = mintAddresses.slice(i, i + BATCH_SIZE);
    try {
      await rateLimiter.acquire();
      const res = await fetch(HELIUS_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAssetBatch", params: { ids: batch } }),
      });
      const json = await res.json();
      const assets = json.result ?? [];

      for (const asset of assets) {
        if (!asset?.id || seen.has(asset.id)) continue;
        seen.add(asset.id);
        results.push({
          mint: asset.id,
          symbol: asset.content?.metadata?.symbol || asset.token_info?.symbol || undefined,
          name: asset.content?.metadata?.name || undefined,
          image: asset.content?.links?.image || asset.content?.files?.[0]?.cdn_uri || asset.content?.files?.[0]?.uri || undefined,
        });
      }
      for (const mint of batch) {
        if (!seen.has(mint)) { seen.add(mint); results.push({ mint }); }
      }
    } catch (err) {
      console.error(`getAssetBatch error for batch at offset ${i}:`, err);
      for (const mint of batch) {
        if (!seen.has(mint)) { seen.add(mint); results.push({ mint }); }
      }
    }
  }
  return results;
}

// --- Slice splitting ---

function splitSlice(slice, count, firstTxEpoch) {
  const startTime = firstTxEpoch ?? 1584316800; // Solana mainnet launch
  const nowEpoch = Math.floor(Date.now() / 1000);
  const endTime = slice.lte > nowEpoch ? nowEpoch : slice.lte;
  const span = endTime - startTime;

  if (span <= 0 || count <= 1) {
    return [{ ...slice, gte: startTime }];
  }

  const sliceSpan = Math.floor(span / count);
  const slices = [];

  for (let i = 0; i < count; i++) {
    const gte = startTime + i * sliceSpan + (i > 0 ? 1 : 0);
    const lte = i === count - 1 ? endTime : startTime + (i + 1) * sliceSpan;
    slices.push({
      gte,
      lte,
      cursor: null,
      pages_fetched: 0,
      txns_fetched: 0,
      done: false,
    });
  }

  return slices;
}

// --- Per-slice processing ---

async function processSliceContinuously(address, slice, sliceStats, abortedRef, globalTxnCounter) {
  if (slice.done) return;

  let cursor = slice.cursor;

  for (let page = 0; ; page++) {
    if (abortedRef.value || shuttingDown) break;

    const opts = {
      transactionDetails: "full",
      sortOrder: "asc",
      limit: PAGE_SIZE,
      encoding: "json",
      maxSupportedTransactionVersion: 0,
      filters: {
        status: "succeeded",
        tokenAccounts: "balanceChanged",
        blockTime: { gte: slice.gte, lte: slice.lte },
      },
    };
    if (cursor) opts.paginationToken = cursor;

    let result;
    try {
      result = await rpcCall("getTransactionsForAddress", [address, opts]);
    } catch (err) {
      if (page === 0) {
        console.warn(`[${address.slice(0, 8)}] Slice [${slice.gte}-${slice.lte}] RPC error on first page: ${err}`);
        slice.done = true;
      }
      break;
    }

    for (const tx of result.data) {
      if (!tx.meta) continue;
      sliceStats.txnCount++;

      if (tx.blockTime !== null && (sliceStats.earliestBt === null || tx.blockTime < sliceStats.earliestBt)) {
        sliceStats.earliestBt = tx.blockTime;
      }
      if (tx.blockTime !== null && (sliceStats.latestBt === null || tx.blockTime > sliceStats.latestBt)) {
        sliceStats.latestBt = tx.blockTime;
      }

      if (tx.meta.postTokenBalances) {
        for (const bal of tx.meta.postTokenBalances) {
          if (bal.owner === address) sliceStats.mints.add(bal.mint);
        }
      }

      const accountKeys = getAccountKeys(tx);
      const walletIndex = accountKeys.indexOf(address);
      if (walletIndex < 0) continue;

      if (walletIndex === 0) {
        sliceStats.fees += BigInt(tx.meta.fee);
      }

      const balanceChange = tx.meta.postBalances[walletIndex] - tx.meta.preBalances[walletIndex];
      const transferAmount = walletIndex === 0 ? balanceChange + tx.meta.fee : balanceChange;
      sliceStats.volume += BigInt(Math.abs(transferAmount));
    }

    slice.pages_fetched++;
    slice.txns_fetched += result.data.length;

    // Atomically increment global counter (safe in single-threaded Node async)
    globalTxnCounter.value += result.data.length;

    if (!result.paginationToken || result.data.length < PAGE_SIZE) {
      slice.done = true;
      slice.cursor = null;
      break;
    }
    cursor = result.paginationToken;
    slice.cursor = cursor;

    // Check global txn cap
    if (globalTxnCounter.value >= MAX_WALLET_TXNS) {
      console.warn(`[${address.slice(0, 8)}] Hit ${MAX_WALLET_TXNS} txn cap across slices — stopping`);
      abortedRef.value = true;
      break;
    }
  }
}

// --- Merge stats from per-slice stats ---

function mergeSliceStats(statsArray) {
  let txnCount = 0;
  let volume = BigInt(0);
  let fees = BigInt(0);
  let earliestBt = null;
  let latestBt = null;
  const mints = new Set();

  for (const s of statsArray) {
    txnCount += s.txnCount;
    volume += s.volume;
    fees += s.fees;
    if (s.earliestBt !== null && (earliestBt === null || s.earliestBt < earliestBt)) earliestBt = s.earliestBt;
    if (s.latestBt !== null && (latestBt === null || s.latestBt > latestBt)) latestBt = s.latestBt;
    for (const m of s.mints) mints.add(m);
  }

  return { txnCount, volume, fees, earliestBt, latestBt, mints };
}

function createSliceStats() {
  return {
    txnCount: 0,
    volume: BigInt(0),
    fees: BigInt(0),
    earliestBt: null,
    latestBt: null,
    mints: new Set(),
  };
}

// --- Checkpoint helper ---

function snapshotSliceStats(statsArray) {
  const snapshot = [];
  for (const s of statsArray) {
    snapshot.push({
      txnCount: s.txnCount,
      volume: s.volume,
      fees: s.fees,
      earliestBt: s.earliestBt,
      latestBt: s.latestBt,
      mints: new Set(s.mints),
    });
    s.txnCount = 0;
    s.volume = BigInt(0);
    s.fees = BigInt(0);
    s.earliestBt = null;
    s.latestBt = null;
    s.mints = new Set();
  }
  return snapshot;
}

// --- Process one job ---

async function processOneJob() {
  let address = null;
  let claimNonce = null;

  try {
    const { data: jobs, error: claimError } = await supabase.rpc("claim_next_ingestion_job");

    if (claimError) {
      console.error("Claim error:", claimError);
      return false;
    }
    if (!jobs || jobs.length === 0) return false;

    const job = jobs[0];
    address = job.address;
    claimNonce = job.claim_nonce;

    activeJobs.add(address);

    let slices = job.slices ?? [{
      gte: 0,
      lte: 9999999999,
      cursor: job.pagination_token ?? null,
      pages_fetched: job.pages_fetched ?? 0,
      txns_fetched: job.txns_fetched ?? 0,
      done: false,
    }];

    // Determine if this is a fresh single-slice job that needs splitting
    const isFreshSingleSlice = slices.length === 1 && !slices[0].cursor && slices[0].pages_fetched === 0;

    if (isFreshSingleSlice) {
      const [activeResult, walletResult] = await Promise.all([
        supabase.from("ingestion_queue").select("address", { count: "exact", head: true }).eq("status", "processing"),
        supabase.from("wallets").select("first_tx_at").eq("address", address).single(),
      ]);

      const activeCount = activeResult.count ?? 1;
      const targetSlices = Math.min(MAX_SLICES, Math.max(1, Math.floor(TARGET_CONCURRENT_CALLS / activeCount)));

      let firstTxEpoch = null;
      if (walletResult.data?.first_tx_at) {
        firstTxEpoch = Math.floor(new Date(walletResult.data.first_tx_at).getTime() / 1000);
      }

      if (targetSlices > 1) {
        slices = splitSlice(slices[0], targetSlices, firstTxEpoch);
        console.log(`[${address.slice(0, 8)}] Split into ${slices.length} slices (${activeCount} active jobs)`);

        const { error: splitSaveError } = await supabase
          .from("ingestion_queue")
          .update({ slices, updated_at: new Date().toISOString() })
          .eq("address", address)
          .eq("claim_nonce", claimNonce);

        if (splitSaveError) {
          console.error(`[${address.slice(0, 8)}] Failed to save split slices:`, splitSaveError);
        }
      } else {
        if (firstTxEpoch) {
          slices[0].gte = firstTxEpoch;
        }
        console.log(`[${address.slice(0, 8)}] Claimed | 1 slice (${activeCount} active jobs)`);
      }
    } else {
      const pendingSlices = slices.filter((s) => !s.done).length;
      console.log(`[${address.slice(0, 8)}] Resuming | ${slices.length} slices (${pendingSlices} pending)`);
    }

    const abortedRef = { value: false };
    const heartbeatInterval = setInterval(async () => {
      try {
        if (shuttingDown) return;
        const { data: heartbeatResult } = await supabase.rpc("heartbeat_ingestion_job", {
          p_address: address,
          p_claim_nonce: claimNonce,
        });
        if (!heartbeatResult) {
          console.warn(`[${address.slice(0, 8)}] Heartbeat failed — aborting`);
          abortedRef.value = true;
        }
      } catch (err) {
        console.error("Heartbeat error:", err);
        abortedRef.value = true;
      }
    }, HEARTBEAT_MS);

    const progressInterval = setInterval(async () => {
      if (abortedRef.value) return;
      const currentTxns = slices.reduce((sum, s) => sum + s.txns_fetched, 0);
      await supabase.from("ingestion_queue")
        .update({ txns_fetched: currentTxns })
        .eq("address", address)
        .eq("claim_nonce", claimNonce);
    }, PROGRESS_MS);

    const globalTxnCounter = { value: slices.reduce((sum, s) => sum + s.txns_fetched, 0) };
    const sliceStatsArray = slices.map(() => createSliceStats());
    const allMints = new Set();

    const checkpointInterval = setInterval(async () => {
      if (abortedRef.value) return;
      try {
        const snapshot = snapshotSliceStats(sliceStatsArray);
        const merged = mergeSliceStats(snapshot);

        for (const m of merged.mints) allMints.add(m);

        if (merged.txnCount === 0) return;

        const totalPages = slices.reduce((sum, s) => sum + s.pages_fetched, 0);
        const totalTxns = slices.reduce((sum, s) => sum + s.txns_fetched, 0);

        const { data: cpResult, error: cpError } = await supabase.rpc("complete_ingestion_batch", {
          p_address: address,
          p_claim_nonce: claimNonce,
          p_slices: slices,
          p_pages_fetched: totalPages,
          p_txns_fetched: totalTxns,
          p_is_complete: false,
          p_txn_count: merged.txnCount,
          p_volume_lamports: merged.volume.toString(),
          p_fees_lamports: merged.fees.toString(),
          p_earliest_blocktime: merged.earliestBt,
          p_unique_tokens: merged.mints.size,
          p_latest_blocktime: merged.latestBt,
        });

        if (cpError) {
          console.error(`[${address.slice(0, 8)}] Checkpoint error:`, cpError);
        } else if (cpResult === false) {
          console.warn(`[${address.slice(0, 8)}] Nonce mismatch at checkpoint — aborting`);
          abortedRef.value = true;
        } else {
          console.log(`[${address.slice(0, 8)}] Checkpoint | ${totalTxns} txns | ${totalPages} pages | ${slices.filter((s) => s.done).length}/${slices.length} slices done`);
        }
      } catch (err) {
        console.error(`[${address.slice(0, 8)}] Checkpoint exception:`, err);
      }
    }, CHECKPOINT_MS);

    const pendingSlices = slices
      .map((slice, i) => ({ slice, stats: sliceStatsArray[i], index: i }))
      .filter(({ slice }) => !slice.done);

    const results = await Promise.allSettled(
      pendingSlices.map(({ slice, stats }) =>
        processSliceContinuously(address, slice, stats, abortedRef, globalTxnCounter)
      )
    );

    clearInterval(heartbeatInterval);
    clearInterval(progressInterval);
    clearInterval(checkpointInterval);

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      for (const f of failures) {
        console.error(`[${address.slice(0, 8)}] Slice failed:`, f.reason);
      }
    }

    const finalSnapshot = snapshotSliceStats(sliceStatsArray);
    const finalMerged = mergeSliceStats(finalSnapshot);
    for (const m of finalMerged.mints) allMints.add(m);

    if (abortedRef.value && globalTxnCounter.value < MAX_WALLET_TXNS) {
      if (finalMerged.txnCount > 0) {
        const totalPages = slices.reduce((sum, s) => sum + s.pages_fetched, 0);
        const totalTxns = slices.reduce((sum, s) => sum + s.txns_fetched, 0);
        await supabase.rpc("complete_ingestion_batch", {
          p_address: address,
          p_claim_nonce: claimNonce,
          p_slices: slices,
          p_pages_fetched: totalPages,
          p_txns_fetched: totalTxns,
          p_is_complete: false,
          p_txn_count: finalMerged.txnCount,
          p_volume_lamports: finalMerged.volume.toString(),
          p_fees_lamports: finalMerged.fees.toString(),
          p_earliest_blocktime: finalMerged.earliestBt,
          p_unique_tokens: finalMerged.mints.size,
          p_latest_blocktime: finalMerged.latestBt,
        });
      }
      console.warn(`[${address.slice(0, 8)}] Aborted`);
      return true;
    }

    if (globalTxnCounter.value >= MAX_WALLET_TXNS) {
      for (const s of slices) s.done = true;
    }

    const allDone = slices.every((s) => s.done);
    const totalPages = slices.reduce((sum, s) => sum + s.pages_fetched, 0);
    const totalTxns = slices.reduce((sum, s) => sum + s.txns_fetched, 0);

    const { data: batchResult, error: batchError } = await supabase.rpc("complete_ingestion_batch", {
      p_address: address,
      p_claim_nonce: claimNonce,
      p_slices: slices,
      p_pages_fetched: totalPages,
      p_txns_fetched: totalTxns,
      p_is_complete: allDone,
      p_txn_count: finalMerged.txnCount,
      p_volume_lamports: finalMerged.volume.toString(),
      p_fees_lamports: finalMerged.fees.toString(),
      p_earliest_blocktime: finalMerged.earliestBt,
      p_unique_tokens: finalMerged.mints.size,
      p_latest_blocktime: finalMerged.latestBt,
    });

    if (batchError) {
      console.error("Final save error:", batchError);
    } else if (batchResult === false) {
      console.warn(`[${address.slice(0, 8)}] Nonce mismatch on final save — discarded`);
      return true;
    }

    if (allDone && batchResult !== false) {
      const mintArray = Array.from(allMints).slice(0, MAX_ENRICHED_MINTS);
      if (mintArray.length > 0) {
        try {
          const enriched = await enrichMints(mintArray);
          const { error: mintError } = await supabase
            .from("wallets")
            .update({ traded_token_mints: enriched })
            .eq("address", address);
          if (mintError) console.error(`[${address.slice(0, 8)}] Failed to store mints:`, mintError);
        } catch (err) {
          console.error(`[${address.slice(0, 8)}] Mint enrichment failed:`, err);
        }
      } else {
        await supabase.from("wallets").update({ traded_token_mints: [] }).eq("address", address);
      }

      const { error: posError } = await supabase.rpc("assign_city_position", { p_address: address });
      if (posError) console.error(`[${address.slice(0, 8)}] Position assignment failed:`, posError);
    }

    console.log(`[${address.slice(0, 8)}] ${allDone ? "Complete" : "Partial"} | ${totalTxns} txns | ${totalPages} pages | ${allMints.size} tokens | ${slices.length} slices`);
    return true;
  } catch (err) {
    console.error(`[${address?.slice(0, 8)}] Error:`, err);

    try {
      if (address && claimNonce) {
        const { data: failedRows } = await supabase
          .from("ingestion_queue")
          .select("address, retry_count")
          .eq("address", address)
          .eq("claim_nonce", claimNonce)
          .eq("status", "processing")
          .limit(1);

        if (failedRows && failedRows.length > 0) {
          const job = failedRows[0];
          const newRetryCount = job.retry_count + 1;
          const newStatus = newRetryCount >= MAX_RETRIES ? "failed" : "pending";

          await supabase
            .from("ingestion_queue")
            .update({
              status: newStatus,
              retry_count: newRetryCount,
              error_message: err instanceof Error ? err.message : "Unknown error",
              updated_at: new Date().toISOString(),
            })
            .eq("address", address)
            .eq("claim_nonce", claimNonce)
            .eq("status", "processing");

          if (newStatus === "failed") {
            await supabase
              .from("wallets")
              .update({ ingestion_status: "failed", updated_at: new Date().toISOString() })
              .eq("address", address);
          }
        }
      }
    } catch (innerErr) {
      console.error("Error handler failed:", innerErr);
    }

    return true;
  } finally {
    if (address) activeJobs.delete(address);
  }
}

// --- Main loop ---

async function workerLoop(id) {
  while (!shuttingDown) {
    try {
      const found = await processOneJob();
      if (!found) {
        if (shuttingDown) break;
        await new Promise((r) => setTimeout(r, IDLE_SLEEP_MS));
      }
    } catch (err) {
      if (shuttingDown) break;
      console.error(`Worker ${id} error:`, err);
      await new Promise((r) => setTimeout(r, IDLE_SLEEP_MS));
    }
  }
  console.log(`[worker] Worker ${id} stopped`);
}

async function main() {
  console.log(`Heliopolis worker started | concurrency: ${CONCURRENCY} | rate limit: ${RATE_LIMIT_PER_SEC} req/s | max slices: ${MAX_SLICES}`);

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => workerLoop(i));
  await Promise.all(workers);

  console.log(`[worker] All workers stopped — exiting`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
