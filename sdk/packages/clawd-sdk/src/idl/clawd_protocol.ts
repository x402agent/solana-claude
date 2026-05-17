/**
 * IDL for the clawd_protocol Anchor program.
 *
 * Novel mechanics:
 *   - Adaptive bonding curve: adjusts fee/liquidity based on live sentiment
 *   - Entropy burns: volatility accumulator drives deflationary burns from reserve
 *   - Behavioral fingerprint burns: penalises detected bots/flippers via reward tax
 *   - Anti-gravity: auto buy-and-burn when price drops below configurable floor
 *   - Agent epoch burns: AI agent activity score drives inflation-reserve burns
 *   - Conviction vaults: lock score = amount × duration × consistency multiplier
 *   - Milestone-gated dev unlocks: time-independent, on-chain milestone conditions
 *   - pToken (Token2022 transfer-hook): vault validates every transfer in real-time
 */

import type { Idl } from "@coral-xyz/anchor";

export const CLAWD_PROTOCOL_IDL = {
  address: "CLAWDpRoToCoLv1pRoGRaM111111111111111111111",
  metadata: {
    name: "clawd_protocol",
    version: "0.1.0",
    spec: "0.1.0",
    description:
      "OpenClawd Protocol — adaptive bonding curves, intelligent vaults, agent-token bindings",
  },

  instructions: [
    // ─── VAULT ────────────────────────────────────────────────────────────────
    {
      name: "initialize_vault",
      discriminator: [1, 0, 0, 0, 0, 0, 0, 0],
      docs: ["Create the vault PDA for a base mint."],
      accounts: [
        { name: "vault", writable: true, pda: { seeds: [{ kind: "const", value: [118, 97, 117, 108, 116] }, { kind: "account", path: "base_mint" }] } },
        { name: "vault_token_account", writable: true },
        { name: "base_mint" },
        { name: "config" },
        { name: "authority", signer: true },
        { name: "token_program" },
        { name: "system_program" },
        { name: "rent" },
      ],
      args: [
        {
          name: "params",
          type: { defined: { name: "InitializeVaultParams" } },
        },
      ],
    },
    {
      name: "lock_tokens",
      discriminator: [2, 0, 0, 0, 0, 0, 0, 0],
      docs: ["Lock tokens in the vault. Returns a LockPosition PDA."],
      accounts: [
        { name: "vault", writable: true },
        { name: "lock_position", writable: true, pda: { seeds: [{ kind: "const", value: [108, 111, 99, 107] }, { kind: "account", path: "vault" }, { kind: "account", path: "owner" }] } },
        { name: "owner_token_account", writable: true },
        { name: "vault_token_account", writable: true },
        { name: "base_mint" },
        { name: "owner", signer: true },
        { name: "token_program" },
        { name: "system_program" },
      ],
      args: [
        {
          name: "params",
          type: { defined: { name: "LockTokensParams" } },
        },
      ],
    },
    {
      name: "unlock_tokens",
      discriminator: [3, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Unlock tokens. Early exit triggers conviction burn (20% of position).",
        "Milestone-gated positions check on-chain state before releasing.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "lock_position", writable: true },
        { name: "owner_token_account", writable: true },
        { name: "vault_token_account", writable: true },
        { name: "burn_mint", writable: true },
        { name: "base_mint" },
        { name: "owner", signer: true },
        { name: "token_program" },
        { name: "system_program" },
      ],
      args: [
        {
          name: "force_early_exit",
          type: "bool",
        },
      ],
    },

    // ─── BURN ENGINE ──────────────────────────────────────────────────────────
    {
      name: "entropy_burn",
      discriminator: [4, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Entropy burn: reads the DBC pool's volatility_accumulator.",
        "When accumulator > entropy_threshold, burns from inflation_reserve.",
        "burn_amount = reserve * (accumulator - threshold) * sensitivity / 1e9",
        "Creates a negative-feedback loop that stabilises price during volatile periods.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "entropy_state", writable: true },
        { name: "dbc_pool", docs: ["Dynamic Bonding Curve pool — read-only for volatility_accumulator"] },
        { name: "inflation_reserve_account", writable: true },
        { name: "base_mint", writable: true },
        { name: "caller", signer: true },
        { name: "token_program" },
      ],
      args: [],
    },
    {
      name: "behavioral_burn",
      discriminator: [5, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Behavioral fingerprint burn: penalises detected bots/flippers.",
        "Computes a behavior_score for a wallet from its recent on-chain activity.",
        "Wallets above BOT_THRESHOLD lose a fraction of their pending rewards — NOT principal.",
        "Called permissionlessly; only reduces rewards, never touches locked principal.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "wallet_behavior", writable: true, pda: { seeds: [{ kind: "const", value: [98, 101, 104, 97, 118] }, { kind: "account", path: "target_wallet" }] } },
        { name: "target_wallet" },
        { name: "rewards_escrow", writable: true },
        { name: "base_mint", writable: true },
        { name: "caller", signer: true },
        { name: "token_program" },
      ],
      args: [
        { name: "trade_count_last_60_slots", type: "u32" },
        { name: "avg_hold_slots", type: "u64" },
        { name: "normalized_position_bps", type: "u16" },
      ],
    },
    {
      name: "anti_gravity_sweep",
      discriminator: [6, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Anti-gravity: when current_price < floor_price, uses fee_reserve to",
        "buy tokens from the DBC pool then immediately burns them.",
        "gravity_strength = (floor - price) / floor * max_strength",
        "buy_amount = fee_reserve * gravity_strength",
        "Creates a self-funding price floor — no centralised control required.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "fee_reserve_account", writable: true },
        { name: "dbc_pool", writable: true },
        { name: "dbc_pool_quote_vault", writable: true },
        { name: "dbc_pool_base_vault", writable: true },
        { name: "base_mint", writable: true },
        { name: "quote_mint" },
        { name: "dbc_program" },
        { name: "vault_authority", pda: { seeds: [{ kind: "const", value: [118, 97, 117, 108, 116, 95, 97, 117, 116, 104] }, { kind: "account", path: "vault" }] } },
        { name: "token_program" },
        { name: "system_program" },
      ],
      args: [],
    },
    {
      name: "agent_epoch_burn",
      discriminator: [7, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Agent epoch burn: burns from inflation_reserve proportional to agent activity.",
        "activity_score = f(tasks_completed, revenue_generated_lamports, uptime_bps)",
        "burn_amount = inflation_reserve * (activity_score / MAX_SCORE) * epoch_burn_rate",
        "Active agents drive more burns — aligns AI utility with token deflation.",
        "Can only be called once per epoch_duration_slots by the bound agent wallet.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "agent_binding" },
        { name: "epoch_record", writable: true, pda: { seeds: [{ kind: "const", value: [101, 112, 111, 99, 104] }, { kind: "account", path: "vault" }] } },
        { name: "inflation_reserve_account", writable: true },
        { name: "base_mint", writable: true },
        { name: "agent_signer", signer: true },
        { name: "token_program" },
        { name: "clock", address: "SysvarC1ock11111111111111111111111111111111" },
      ],
      args: [
        { name: "tasks_completed", type: "u32" },
        { name: "revenue_generated_lamports", type: "u64" },
        { name: "uptime_bps", type: "u16" },
      ],
    },

    // ─── CONVICTION VAULT ─────────────────────────────────────────────────────
    {
      name: "conviction_stake",
      discriminator: [8, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Stake tokens for conviction scoring.",
        "conviction_score = amount * duration_days * consistency_multiplier",
        "consistency_multiplier = 1.0 + consecutive_epochs * 0.1",
        "Score determines protocol revenue share and vote weight.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "conviction_position", writable: true, pda: { seeds: [{ kind: "const", value: [99, 111, 110, 118, 105, 99] }, { kind: "account", path: "vault" }, { kind: "account", path: "staker" }] } },
        { name: "staker_token_account", writable: true },
        { name: "conviction_pool_account", writable: true },
        { name: "base_mint" },
        { name: "staker", signer: true },
        { name: "token_program" },
        { name: "system_program" },
        { name: "clock", address: "SysvarC1ock11111111111111111111111111111111" },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "lock_duration_slots", type: "u64" },
      ],
    },
    {
      name: "conviction_unstake",
      discriminator: [9, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Unstake conviction tokens.",
        "Early exit burns 20% of principal — not a fee, an actual burn.",
        "This creates real cost to speculation on conviction positions.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "conviction_position", writable: true },
        { name: "staker_token_account", writable: true },
        { name: "conviction_pool_account", writable: true },
        { name: "base_mint", writable: true },
        { name: "staker", signer: true },
        { name: "token_program" },
        { name: "clock", address: "SysvarC1ock11111111111111111111111111111111" },
      ],
      args: [],
    },
    {
      name: "claim_conviction_rewards",
      discriminator: [10, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Claim accumulated protocol revenue proportional to conviction score.",
        "share = staker_score / total_conviction_score * epoch_revenue",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "conviction_position", writable: true },
        { name: "revenue_pool_account", writable: true },
        { name: "staker_token_account", writable: true },
        { name: "base_mint" },
        { name: "staker", signer: true },
        { name: "token_program" },
      ],
      args: [],
    },

    // ─── MILESTONE GATED UNLOCKS ──────────────────────────────────────────────
    {
      name: "create_milestone_lock",
      discriminator: [11, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Create a dev/team lock that only unlocks when on-chain milestones are met.",
        "Milestones verified on-chain — no centralised oracle required.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "milestone_lock", writable: true, pda: { seeds: [{ kind: "const", value: [109, 105, 108, 101, 115, 116, 111, 110, 101] }, { kind: "account", path: "vault" }, { kind: "account", path: "creator" }] } },
        { name: "creator_token_account", writable: true },
        { name: "vault_token_account", writable: true },
        { name: "base_mint" },
        { name: "creator", signer: true },
        { name: "token_program" },
        { name: "system_program" },
      ],
      args: [
        {
          name: "params",
          type: { defined: { name: "MilestoneLockParams" } },
        },
      ],
    },
    {
      name: "verify_milestone",
      discriminator: [12, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Verify and record milestone achievement.",
        "Anyone can call this — it checks verifiable on-chain state.",
        "Triggers partial unlock if a milestone is newly met.",
      ],
      accounts: [
        { name: "vault", writable: true },
        { name: "milestone_lock", writable: true },
        { name: "vault_token_account", writable: true },
        { name: "creator_token_account", writable: true },
        { name: "dbc_pool", docs: ["Read-only: check quote_reserve for market cap proxy"] },
        { name: "base_mint" },
        { name: "caller", signer: true },
        { name: "token_program" },
      ],
      args: [
        { name: "milestone_index", type: "u8" },
        { name: "holder_count_attestation", type: { option: "u32" } },
      ],
    },

    // ─── AGENT REGISTRY ───────────────────────────────────────────────────────
    {
      name: "launch_agent_token",
      discriminator: [13, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Atomically: create Token2022 mint, create DBC pool, register agent binding.",
        "The agent's pubkey is embedded in the token's metadata extension.",
        "Sets up vault with default entropy burn + anti-gravity config.",
      ],
      accounts: [
        { name: "agent_binding", writable: true, pda: { seeds: [{ kind: "const", value: [97, 103, 101, 110, 116] }, { kind: "account", path: "agent_wallet" }] } },
        { name: "base_mint", writable: true, signer: true },
        { name: "vault", writable: true },
        { name: "vault_token_account", writable: true },
        { name: "dbc_config" },
        { name: "dbc_pool", writable: true },
        { name: "agent_wallet", signer: true },
        { name: "fee_receiver" },
        { name: "token_program_2022", address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" },
        { name: "dbc_program" },
        { name: "system_program" },
        { name: "rent" },
      ],
      args: [
        {
          name: "params",
          type: { defined: { name: "LaunchAgentTokenParams" } },
        },
      ],
    },
    {
      name: "register_agent_binding",
      discriminator: [14, 0, 0, 0, 0, 0, 0, 0],
      docs: ["Bind an existing token mint to an agent wallet pubkey."],
      accounts: [
        { name: "agent_binding", writable: true, pda: { seeds: [{ kind: "const", value: [97, 103, 101, 110, 116] }, { kind: "account", path: "agent_wallet" }] } },
        { name: "base_mint" },
        { name: "agent_wallet", signer: true },
        { name: "authority", signer: true },
        { name: "system_program" },
      ],
      args: [
        {
          name: "params",
          type: { defined: { name: "RegisterAgentBindingParams" } },
        },
      ],
    },

    // ─── ADAPTIVE CURVE ───────────────────────────────────────────────────────
    {
      name: "update_curve_sentiment",
      discriminator: [15, 0, 0, 0, 0, 0, 0, 0],
      docs: [
        "Update the adaptive curve's sentiment state from recent swap history.",
        "sentiment_score = (buy_volume - sell_volume) / total_volume",
        "Adjusts the DBC config's base_fee and curve liquidity distribution.",
        "Called at most once per sentiment_update_interval_slots.",
      ],
      accounts: [
        { name: "sentiment_state", writable: true, pda: { seeds: [{ kind: "const", value: [115, 101, 110, 116, 105] }, { kind: "account", path: "dbc_pool" }] } },
        { name: "dbc_pool" },
        { name: "vault" },
        { name: "caller", signer: true },
        { name: "clock", address: "SysvarC1ock11111111111111111111111111111111" },
      ],
      args: [
        { name: "recent_buy_volume", type: "u64" },
        { name: "recent_sell_volume", type: "u64" },
        { name: "window_slots", type: "u32" },
      ],
    },

    // ─── PTOKEN TRANSFER HOOK ─────────────────────────────────────────────────
    {
      name: "transfer_hook",
      discriminator: [105, 37, 101, 197, 75, 251, 102, 26],
      docs: [
        "Token2022 transfer hook — called on every pToken transfer.",
        "Records transfer for behavioral analysis.",
        "Routes transfer_fee_bps of amount into fee_reserve.",
        "Updates wallet activity trackers for behavioral burn scoring.",
      ],
      accounts: [
        { name: "source_token" },
        { name: "mint" },
        { name: "destination_token" },
        { name: "owner" },
        { name: "extra_account_metas", pda: { seeds: [{ kind: "const", value: [101, 120, 116, 114, 97, 45, 97, 99, 99, 111, 117, 110, 116, 45, 109, 101, 116, 97, 115] }, { kind: "account", path: "mint" }] } },
        { name: "vault", writable: true },
        { name: "fee_reserve_account", writable: true },
        { name: "source_behavior", writable: true },
        { name: "destination_behavior", writable: true },
        { name: "token_program_2022", address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "decimals", type: "u8" },
      ],
    },
    {
      name: "initialize_extra_account_meta_list",
      discriminator: [43, 34, 13, 49, 167, 88, 235, 235],
      docs: ["Register the extra accounts required by the transfer hook."],
      accounts: [
        { name: "extra_account_metas", writable: true, pda: { seeds: [{ kind: "const", value: [101, 120, 116, 114, 97, 45, 97, 99, 99, 111, 117, 110, 116, 45, 109, 101, 116, 97, 115] }, { kind: "account", path: "mint" }] } },
        { name: "mint" },
        { name: "vault" },
        { name: "fee_reserve_account" },
        { name: "authority", signer: true },
        { name: "system_program" },
      ],
      args: [],
    },
  ],

  accounts: [
    {
      name: "Vault",
      discriminator: [211, 8, 232, 43, 2, 152, 117, 119],
      docs: ["Central vault PDA for a token mint."],
    },
    {
      name: "LockPosition",
      discriminator: [188, 52, 152, 116, 211, 163, 232, 201],
    },
    {
      name: "ConvictionPosition",
      discriminator: [77, 132, 95, 210, 188, 243, 115, 55],
    },
    {
      name: "MilestoneLock",
      discriminator: [145, 238, 12, 192, 77, 186, 33, 229],
    },
    {
      name: "AgentBinding",
      discriminator: [99, 154, 87, 243, 12, 176, 211, 88],
    },
    {
      name: "SentimentState",
      discriminator: [34, 208, 153, 78, 211, 107, 92, 11],
    },
    {
      name: "EntropyState",
      discriminator: [178, 121, 55, 203, 24, 65, 155, 211],
    },
    {
      name: "WalletBehavior",
      discriminator: [92, 172, 214, 188, 77, 130, 203, 55],
    },
    {
      name: "EpochRecord",
      discriminator: [213, 44, 156, 99, 177, 201, 33, 88],
    },
  ],

  types: [
    // ─── PARAMS ───────────────────────────────────────────────────────────────
    {
      name: "InitializeVaultParams",
      type: {
        kind: "struct",
        fields: [
          { name: "inflation_reserve_amount", type: "u64", docs: ["Tokens allocated to inflation reserve for burns"] },
          { name: "entropy_threshold", type: "u32", docs: ["volatility_accumulator threshold that triggers entropy burn"] },
          { name: "entropy_sensitivity_bps", type: "u32", docs: ["Basis points of reserve burned per unit of excess entropy"] },
          { name: "anti_gravity_floor_bps", type: "u16", docs: ["Price floor as % of ATH, in basis points (e.g. 7000 = 70% of ATH)"] },
          { name: "anti_gravity_max_strength_bps", type: "u16", docs: ["Max % of fee_reserve spent in a single anti-gravity sweep"] },
          { name: "transfer_fee_bps", type: "u16", docs: ["pToken transfer fee in basis points (routes to fee_reserve)"] },
          { name: "epoch_duration_slots", type: "u64", docs: ["Slots per agent epoch (e.g. 216000 = ~24h on mainnet)"] },
          { name: "epoch_burn_rate_bps", type: "u16", docs: ["Max % of inflation_reserve burned per epoch at full agent activity"] },
        ],
      },
    },
    {
      name: "LockTokensParams",
      type: {
        kind: "struct",
        fields: [
          { name: "amount", type: "u64" },
          { name: "lock_type", type: { defined: { name: "LockType" } } },
          { name: "duration_slots", type: { option: "u64" }, docs: ["Required for TimeLock and HybridLock types"] },
          { name: "milestone_config_index", type: { option: "u8" }, docs: ["Required for MilestoneLock type — index into milestone table"] },
        ],
      },
    },
    {
      name: "MilestoneLockParams",
      type: {
        kind: "struct",
        fields: [
          { name: "total_locked_amount", type: "u64" },
          { name: "milestones", type: { vec: { defined: { name: "MilestoneCondition" } } } },
        ],
      },
    },
    {
      name: "LaunchAgentTokenParams",
      type: {
        kind: "struct",
        fields: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "uri", type: "string" },
          { name: "decimals", type: "u8" },
          { name: "initial_supply", type: "u64" },
          { name: "token_standard", type: { defined: { name: "TokenStandard" } } },
          { name: "vault_config", type: { defined: { name: "InitializeVaultParams" } } },
          { name: "curve_config", type: { defined: { name: "AgentCurveConfig" } } },
          { name: "agent_character_hash", type: { array: ["u8", 32] }, docs: ["SHA-256 of the agent's character JSON — immutably embedded"] },
          { name: "constitution_hash", type: { array: ["u8", 32] }, docs: ["SHA-256 of three-laws.md — binds agent to the three laws"] },
        ],
      },
    },
    {
      name: "RegisterAgentBindingParams",
      type: {
        kind: "struct",
        fields: [
          { name: "agent_pubkey", type: "publicKey" },
          { name: "character_hash", type: { array: ["u8", 32] } },
          { name: "constitution_hash", type: { array: ["u8", 32] } },
          { name: "capabilities", type: "u64", docs: ["Bitmask: 0x01=trading 0x02=spawning 0x04=payments 0x08=research"] },
        ],
      },
    },
    {
      name: "AgentCurveConfig",
      type: {
        kind: "struct",
        fields: [
          { name: "base_fee_bps", type: "u16" },
          { name: "sentiment_fee_range_bps", type: "u16", docs: ["Max fee adjustment from sentiment (added or subtracted)"] },
          { name: "sentiment_update_interval_slots", type: "u32" },
          { name: "migration_quote_threshold", type: "u64" },
          { name: "initial_buy_amount", type: { option: "u64" }, docs: ["Optional: agent purchases tokens at launch with minimum fee"] },
        ],
      },
    },
    {
      name: "MilestoneCondition",
      type: {
        kind: "struct",
        fields: [
          { name: "milestone_type", type: { defined: { name: "MilestoneType" } } },
          { name: "threshold", type: "u64" },
          { name: "unlock_bps", type: "u16", docs: ["Portion of locked amount unlocked when this milestone is hit"] },
          { name: "achieved", type: "bool" },
        ],
      },
    },

    // ─── ACCOUNT LAYOUTS ──────────────────────────────────────────────────────
    {
      name: "VaultState",
      type: {
        kind: "struct",
        fields: [
          { name: "base_mint", type: "publicKey" },
          { name: "dbc_pool", type: "publicKey" },
          { name: "agent_binding", type: { option: "publicKey" } },
          { name: "vault_token_account", type: "publicKey" },
          { name: "fee_reserve_account", type: "publicKey" },
          { name: "inflation_reserve_amount", type: "u64" },
          { name: "total_locked", type: "u64" },
          { name: "total_conviction_score", type: "u128" },
          { name: "total_burned", type: "u64" },
          { name: "total_fees_collected", type: "u64" },
          { name: "ath_quote_price", type: "u128", docs: ["All-time-high sqrt_price for anti-gravity floor calculation"] },
          { name: "entropy_threshold", type: "u32" },
          { name: "entropy_sensitivity_bps", type: "u32" },
          { name: "anti_gravity_floor_bps", type: "u16" },
          { name: "anti_gravity_max_strength_bps", type: "u16" },
          { name: "transfer_fee_bps", type: "u16" },
          { name: "epoch_duration_slots", type: "u64" },
          { name: "epoch_burn_rate_bps", type: "u16" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "LockPositionState",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "publicKey" },
          { name: "vault", type: "publicKey" },
          { name: "locked_amount", type: "u64" },
          { name: "lock_type", type: { defined: { name: "LockType" } } },
          { name: "locked_at_slot", type: "u64" },
          { name: "unlock_slot", type: { option: "u64" } },
          { name: "milestone_index", type: { option: "u8" } },
          { name: "is_unlocked", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "ConvictionPositionState",
      type: {
        kind: "struct",
        fields: [
          { name: "staker", type: "publicKey" },
          { name: "vault", type: "publicKey" },
          { name: "staked_amount", type: "u64" },
          { name: "lock_duration_slots", type: "u64" },
          { name: "staked_at_slot", type: "u64" },
          { name: "unlock_slot", type: "u64" },
          { name: "conviction_score", type: "u128" },
          { name: "consecutive_epochs", type: "u32" },
          { name: "last_claim_slot", type: "u64" },
          { name: "total_rewards_claimed", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "AgentBindingState",
      type: {
        kind: "struct",
        fields: [
          { name: "agent_pubkey", type: "publicKey" },
          { name: "base_mint", type: "publicKey" },
          { name: "vault", type: "publicKey" },
          { name: "character_hash", type: { array: ["u8", 32] } },
          { name: "constitution_hash", type: { array: ["u8", 32] } },
          { name: "capabilities", type: "u64" },
          { name: "is_active", type: "bool" },
          { name: "created_at_slot", type: "u64" },
          { name: "last_activity_slot", type: "u64" },
          { name: "lifetime_tasks_completed", type: "u64" },
          { name: "lifetime_revenue_lamports", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "SentimentStateData",
      type: {
        kind: "struct",
        fields: [
          { name: "dbc_pool", type: "publicKey" },
          { name: "last_update_slot", type: "u64" },
          { name: "sentiment_score_signed", type: "i64", docs: ["range [-1e9, 1e9] where +1e9 = max bullish, -1e9 = max bearish"] },
          { name: "ema_buy_volume", type: "u128" },
          { name: "ema_sell_volume", type: "u128" },
          { name: "current_fee_adjustment_bps", type: "i16", docs: ["Applied on top of base_fee — negative = discount, positive = premium"] },
          { name: "update_interval_slots", type: "u32" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "EntropyStateData",
      type: {
        kind: "struct",
        fields: [
          { name: "vault", type: "publicKey" },
          { name: "last_burn_slot", type: "u64" },
          { name: "total_entropy_burns", type: "u64" },
          { name: "total_entropy_burned_tokens", type: "u64" },
          { name: "peak_volatility_accumulator", type: "u32" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "WalletBehaviorState",
      type: {
        kind: "struct",
        fields: [
          { name: "wallet", type: "publicKey" },
          { name: "trade_count_last_60_slots", type: "u32" },
          { name: "avg_hold_slots", type: "u64" },
          { name: "normalized_position_bps", type: "u16" },
          { name: "behavior_score", type: "u32", docs: ["0 = clean, 10000 = definite bot"] },
          { name: "total_rewards_burned", type: "u64" },
          { name: "last_updated_slot", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "EpochRecordState",
      type: {
        kind: "struct",
        fields: [
          { name: "vault", type: "publicKey" },
          { name: "epoch_number", type: "u64" },
          { name: "last_epoch_start_slot", type: "u64" },
          { name: "total_epoch_burns", type: "u64" },
          { name: "last_activity_score", type: "u32" },
          { name: "bump", type: "u8" },
        ],
      },
    },

    // ─── ENUMS ────────────────────────────────────────────────────────────────
    {
      name: "LockType",
      type: {
        kind: "enum",
        variants: [
          { name: "TimeLock", docs: ["Standard time-based lock — unlocks after duration_slots"] },
          { name: "MilestoneLock", docs: ["Unlocks in tranches as on-chain milestones are verified"] },
          {
            name: "HybridLock",
            docs: ["Unlocks whichever comes first: time OR milestone — best for uncertain launches"],
          },
          {
            name: "ConvictionLock",
            docs: ["Conviction scoring lock — earns score & revenue share, 20% burn on early exit"],
          },
        ],
      },
    },
    {
      name: "TokenStandard",
      type: {
        kind: "enum",
        variants: [
          { name: "Spl", docs: ["Standard SPL Token (Token Program)"] },
          { name: "Token2022", docs: ["Token Extensions (Token-2022 Program)"] },
          {
            name: "PToken",
            docs: [
              "Programmable Token: Token2022 + TransferHook extension.",
              "Hook calls this program on every transfer for real-time behavioral tracking,",
              "transfer fees, and conviction score updates.",
            ],
          },
        ],
      },
    },
    {
      name: "MilestoneType",
      type: {
        kind: "enum",
        variants: [
          { name: "HolderCount" },
          { name: "MarketCapQuote" },
          { name: "CumulativeVolume" },
          { name: "GraduationAchieved" },
          { name: "AgentTasksCompleted" },
        ],
      },
    },
  ],

  errors: [
    { code: 6000, name: "EntropyBelowThreshold", msg: "Volatility accumulator has not exceeded entropy threshold" },
    { code: 6001, name: "AntiGravityNotTriggered", msg: "Current price is above the anti-gravity floor" },
    { code: 6002, name: "EpochNotElapsed", msg: "Epoch duration has not passed since last agent burn" },
    { code: 6003, name: "AlreadyUnlocked", msg: "Lock position is already unlocked" },
    { code: 6004, name: "LockNotMatured", msg: "Lock period has not elapsed" },
    { code: 6005, name: "MilestoneNotMet", msg: "Milestone condition has not been satisfied on-chain" },
    { code: 6006, name: "MilestoneAlreadyAchieved", msg: "This milestone has already been verified and claimed" },
    { code: 6007, name: "InvalidAgentSigner", msg: "Signer does not match the registered agent wallet" },
    { code: 6008, name: "ConstitutionHashMismatch", msg: "Constitution hash does not match three-laws.md" },
    { code: 6009, name: "SentimentUpdateTooSoon", msg: "Sentiment update interval has not elapsed" },
    { code: 6010, name: "InsufficientFeeReserve", msg: "Fee reserve insufficient for anti-gravity sweep" },
    { code: 6011, name: "InvalidTokenStandard", msg: "Token standard mismatch for this operation" },
    { code: 6012, name: "ConvictionLockEarlyExit", msg: "Early exit from conviction lock triggers 20% burn" },
    { code: 6013, name: "ZeroAmount", msg: "Amount must be greater than zero" },
    { code: 6014, name: "MaxMilestonesExceeded", msg: "Maximum of 8 milestones per lock" },
    { code: 6015, name: "BehaviorScoreUpdateTooSoon", msg: "Behavior score was updated too recently" },
  ],
} as const;

export type ClawdProtocol = typeof CLAWD_PROTOCOL_IDL;

// Re-export as typed Idl for use with Program<>
export const CLAWD_PROTOCOL_IDL_TYPED = CLAWD_PROTOCOL_IDL as unknown as Idl;
