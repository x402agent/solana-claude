package openShell.network

import rego.v1

# ---------------------------------------------------------------------------
# solana-clawd — Network Egress Policy
# OPA/Rego policy enforced by the OpenShell sandbox.
# Only hosts in the allowlist may receive outbound connections.
# All other egress is denied by default.
# ---------------------------------------------------------------------------

default allow := false

# Allow all requests whose host matches an entry in the allowlist.
allow if {
    some pattern in allowed_patterns
    glob.match(pattern, ["."], input.host)
}

# ---------------------------------------------------------------------------
# Allowed egress hosts (explicit allowlist — deny all others)
# ---------------------------------------------------------------------------

allowed_patterns := {
    # Helius RPC — primary Solana RPC provider
    "*.helius-rpc.com",
    "api.helius.xyz",
    "api-mainnet.helius-rpc.com",

    # Solana public RPC endpoints
    "api.mainnet-beta.solana.com",
    "api.devnet.solana.com",

    # Jupiter aggregator — swap routing and price quotes
    "*.jup.ag",
    "quote-api.jup.ag",

    # CoinGecko — price data
    "api.coingecko.com",

    # Birdeye — on-chain token analytics
    "public-api.birdeye.so",

    # xAI LLM API
    "api.x.ai",

    # OpenRouter — LLM gateway
    "openrouter.ai",

    # SolanaTracker — token/wallet intelligence
    "data.solanatracker.io",

    # Pump.fun — meme token launchpad
    "pump.fun",

    # Convex — real-time backend
    "*.convex.cloud",

    # Anthropic — Claude LLM API
    "api.anthropic.com",

    # ElevenLabs — voice synthesis
    "api.elevenlabs.io",

    # AssemblyAI — speech-to-text streaming
    "streaming.assemblyai.com",
}

# ---------------------------------------------------------------------------
# Violation metadata (surfaced in OPA decision logs)
# ---------------------------------------------------------------------------

deny contains reason if {
    not allow
    reason := sprintf(
        "egress denied: host '%s' is not in the solana-clawd allowlist",
        [input.host],
    )
}
