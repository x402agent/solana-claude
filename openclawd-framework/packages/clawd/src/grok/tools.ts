import { GrokTool } from "./client.js";
import { MCPManager, MCPTool } from "../mcp/client.js";
import { loadMCPConfig } from "../mcp/config.js";

const BASE_GROK_TOOLS: GrokTool[] = [
  {
    type: "function",
    function: {
      name: "view_file",
      description: "View contents of a file or list directory contents",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to file or directory to view",
          },
          start_line: {
            type: "number",
            description:
              "Starting line number for partial file view (optional)",
          },
          end_line: {
            type: "number",
            description: "Ending line number for partial file view (optional)",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Create a new file with specified content",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path where the file should be created",
          },
          content: {
            type: "string",
            description: "Content to write to the file",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "str_replace_editor",
      description: "Replace specific text in a file. Use this for single line edits only",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to the file to edit",
          },
          old_str: {
            type: "string",
            description:
              "Text to replace (must match exactly, or will use fuzzy matching for multi-line strings)",
          },
          new_str: {
            type: "string",
            description: "Text to replace with",
          },
          replace_all: {
            type: "boolean",
            description:
              "Replace all occurrences (default: false, only replaces first occurrence)",
          },
        },
        required: ["path", "old_str", "new_str"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "bash",
      description: "Execute a bash command",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search",
      description:
        "Unified search tool for finding text content or files (similar to Cursor's search)",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Text to search for or file name/path pattern",
          },
          search_type: {
            type: "string",
            enum: ["text", "files", "both"],
            description:
              "Type of search: 'text' for content search, 'files' for file names, 'both' for both (default: 'both')",
          },
          include_pattern: {
            type: "string",
            description:
              "Glob pattern for files to include (e.g. '*.ts', '*.js')",
          },
          exclude_pattern: {
            type: "string",
            description:
              "Glob pattern for files to exclude (e.g. '*.log', 'node_modules')",
          },
          case_sensitive: {
            type: "boolean",
            description:
              "Whether search should be case sensitive (default: false)",
          },
          whole_word: {
            type: "boolean",
            description: "Whether to match whole words only (default: false)",
          },
          regex: {
            type: "boolean",
            description: "Whether query is a regex pattern (default: false)",
          },
          max_results: {
            type: "number",
            description: "Maximum number of results to return (default: 50)",
          },
          file_types: {
            type: "array",
            items: { type: "string" },
            description: "File types to search (e.g. ['js', 'ts', 'py'])",
          },
          include_hidden: {
            type: "boolean",
            description: "Whether to include hidden files (default: false)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_todo_list",
      description: "Create a new todo list for planning and tracking tasks",
      parameters: {
        type: "object",
        properties: {
          todos: {
            type: "array",
            description: "Array of todo items",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Unique identifier for the todo item",
                },
                content: {
                  type: "string",
                  description: "Description of the todo item",
                },
                status: {
                  type: "string",
                  enum: ["pending", "in_progress", "completed"],
                  description: "Current status of the todo item",
                },
                priority: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Priority level of the todo item",
                },
              },
              required: ["id", "content", "status", "priority"],
            },
          },
        },
        required: ["todos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_todo_list",
      description: "Update existing todos in the todo list",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            description: "Array of todo updates",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "ID of the todo item to update",
                },
                status: {
                  type: "string",
                  enum: ["pending", "in_progress", "completed"],
                  description: "New status for the todo item",
                },
                content: {
                  type: "string",
                  description: "New content for the todo item",
                },
                priority: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "New priority for the todo item",
                },
              },
              required: ["id"],
            },
          },
        },
        required: ["updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solana_get_asset",
      description: "Retrieve comprehensive data for any Solana NFT or digital asset by its unique identifier using Helius DAS API. Supports compressed NFTs (cNFTs), programmable NFTs (pNFTs), and traditional SPL tokens. Returns complete on-chain and off-chain metadata, ownership details, royalty information, collection data, and compression state.",
      parameters: {
        type: "object",
        properties: {
          asset_id: {
            type: "string",
            description: "The unique identifier (address) of the Solana asset (NFT, cNFT, pNFT, or SPL token)",
          },
        },
        required: ["asset_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solana_get_price",
      description: "Retrieve the latest price information for a specified Solana token using Birdeye API. Returns token price in USD, symbol, name, decimals, and update timestamp.",
      parameters: {
        type: "object",
        properties: {
          token_address: {
            type: "string",
            description: "The Solana token address (mint address) to get price for",
          },
        },
        required: ["token_address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solana_get_wallet_balance",
      description: "Get Solana wallet balance and token account information. Returns SOL balance in lamports and SOL, plus all token accounts associated with the wallet.",
      parameters: {
        type: "object",
        properties: {
          wallet_address: { type: "string", description: "The Solana wallet address (public key) to query" },
        },
        required: ["wallet_address"],
      },
    },
  },
  // --- Birdeye extended token data ---
  {
    type: "function",
    function: {
      name: "birdeye_token_overview",
      description: "Birdeye token overview: price, market cap, FDV, liquidity, price changes across timeframes, unique wallets, volume, holder count.",
      parameters: { type: "object", properties: { address: { type: "string" }, frames: { type: "string", description: "Optional comma-separated timeframes e.g. '1m,5m,1h,24h'" } }, required: ["address"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_token_metadata",
      description: "Birdeye token metadata: symbol, name, decimals, logo, social links for a single token.",
      parameters: { type: "object", properties: { address: { type: "string" }, chain: { type: "string", description: "Chain name, default solana" } }, required: ["address"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_token_metadata_multi",
      description: "Birdeye metadata for up to 50 tokens at once.",
      parameters: { type: "object", properties: { addresses: { type: "array", items: { type: "string" } }, chain: { type: "string" } }, required: ["addresses"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_token_market_data",
      description: "Birdeye market data: price, liquidity, supply, market cap, FDV, holders.",
      parameters: { type: "object", properties: { address: { type: "string" }, chain: { type: "string" } }, required: ["address"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_token_market_data_multi",
      description: "Birdeye market data for up to 20 tokens.",
      parameters: { type: "object", properties: { addresses: { type: "array", items: { type: "string" } }, chain: { type: "string" } }, required: ["addresses"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_token_trade_data",
      description: "Birdeye trade data: buy/sell counts, volume, unique wallets across timeframes.",
      parameters: { type: "object", properties: { address: { type: "string" }, frames: { type: "string" }, chain: { type: "string" } }, required: ["address"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_token_trade_data_multi",
      description: "Birdeye trade data for up to 20 tokens.",
      parameters: { type: "object", properties: { addresses: { type: "array", items: { type: "string" } }, frames: { type: "string" }, chain: { type: "string" } }, required: ["addresses"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_search_token",
      description: "Search for tokens by keyword on Birdeye. Returns top matches sorted by 24h USD volume.",
      parameters: { type: "object", properties: { keyword: { type: "string" }, chain: { type: "string" }, limit: { type: "number" } }, required: ["keyword"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_token_list",
      description: "Paginated token list on Birdeye, sorted by a metric (default v24hUSD desc).",
      parameters: { type: "object", properties: { sort_by: { type: "string" }, sort_type: { type: "string", enum: ["asc", "desc"] }, offset: { type: "number" }, limit: { type: "number" }, chain: { type: "string" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_trending",
      description: "Currently trending tokens on Birdeye.",
      parameters: { type: "object", properties: { limit: { type: "number" }, chain: { type: "string" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_ohlcv",
      description: "OHLCV candle data for a token. type: 1m/5m/15m/30m/1H/2H/4H/6H/8H/12H/1D/3D/1W/1M.",
      parameters: { type: "object", properties: { address: { type: "string" }, type: { type: "string" }, time_from: { type: "number" }, time_to: { type: "number" }, chain: { type: "string" } }, required: ["address"] },
    },
  },
  {
    type: "function",
    function: {
      name: "birdeye_wallet_portfolio",
      description: "All tokens held by a wallet via Birdeye.",
      parameters: { type: "object", properties: { wallet: { type: "string" }, chain: { type: "string" } }, required: ["wallet"] },
    },
  },
  // --- Wallet (signing) ---
  {
    type: "function",
    function: {
      name: "wallet_address",
      description: "Get the public key of the locally configured Solana signing wallet (SOLANA_PRIVATE_KEY).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "wallet_balance",
      description: "Get SOL balance of the locally configured signing wallet.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "wallet_sign_and_send",
      description: "Sign (with local SOLANA_PRIVATE_KEY) and send a base64-encoded Solana transaction. Requires user confirmation. Returns tx signature + explorer link.",
      parameters: { type: "object", properties: { base64_tx: { type: "string" } }, required: ["base64_tx"] },
    },
  },
  // --- DFlow Trading API ---
  {
    type: "function",
    function: {
      name: "dflow_tokens",
      description: "List supported token mints on DFlow (any mint with an available trading pool at least once).",
      parameters: { type: "object", properties: { with_decimals: { type: "boolean" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_venues",
      description: "List venues (AMMs/CLOBs) DFlow aggregates for swaps.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_priority_fees",
      description: "Get current Solana priority fee estimates (medium/high/veryHigh micro-lamports per CU) from DFlow.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_swap_quote",
      description: "Get a DFlow swap quote across aggregated venues (Jupiter-style). Returns route, input/output amounts, price impact.",
      parameters: {
        type: "object",
        properties: {
          user_public_key: { type: "string" },
          input_mint: { type: "string" },
          output_mint: { type: "string" },
          amount: { type: "string", description: "Raw amount in smallest units (lamports for SOL, base units for SPL)" },
          slippage_bps: { type: "number" },
          swap_mode: { type: "string", enum: ["ExactIn", "ExactOut"] },
          venues: { type: "array", items: { type: "string" } },
        },
        required: ["user_public_key", "input_mint", "output_mint", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_build_swap",
      description: "Build a base64 swap transaction from a DFlow quote object. Pass the result to wallet_sign_and_send.",
      parameters: {
        type: "object",
        properties: {
          user_public_key: { type: "string" },
          quote: { type: "object" },
          priority_fee_micro_lamports: { type: "number" },
          compute_unit_limit: { type: "number" },
        },
        required: ["user_public_key", "quote"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_order_status",
      description: "Get DFlow order status by order id.",
      parameters: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_prediction_market_init",
      description: "Idempotent init transaction for a DFlow prediction market. Returns a base64 transaction the payer must sign.",
      parameters: {
        type: "object",
        properties: { payer: { type: "string" }, outcome_mint: { type: "string" } },
        required: ["payer", "outcome_mint"],
      },
    },
  },
  // --- DFlow Metadata API (Kalshi/Polymarket-style prediction markets) ---
  {
    type: "function",
    function: {
      name: "dflow_events",
      description: "List prediction-market events. Pass params like category, tags, status, limit, cursor.",
      parameters: { type: "object", properties: { params: { type: "object" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_event",
      description: "Get a single prediction-market event by ticker.",
      parameters: { type: "object", properties: { event_ticker: { type: "string" } }, required: ["event_ticker"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_markets",
      description: "List prediction markets.",
      parameters: { type: "object", properties: { params: { type: "object" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_market",
      description: "Get a single market by ticker.",
      parameters: { type: "object", properties: { ticker: { type: "string" } }, required: ["ticker"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_orderbook",
      description: "Get orderbook for a prediction market by ticker.",
      parameters: { type: "object", properties: { market_ticker: { type: "string" } }, required: ["market_ticker"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_orderbook_by_mint",
      description: "Get orderbook by ledger/outcome mint address.",
      parameters: { type: "object", properties: { mint_address: { type: "string" } }, required: ["mint_address"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_trades",
      description: "List off-chain trades for prediction markets.",
      parameters: { type: "object", properties: { params: { type: "object" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_trades_by_mint",
      description: "Trades for a specific mint address.",
      parameters: { type: "object", properties: { mint_address: { type: "string" }, params: { type: "object" } }, required: ["mint_address"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_onchain_trades",
      description: "List on-chain fills (actual Solana swaps) for prediction markets.",
      parameters: { type: "object", properties: { params: { type: "object" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_live_data",
      description: "Kalshi live data passthrough by milestone IDs (max 100). Structure varies per sport/category.",
      parameters: { type: "object", properties: { milestone_ids: { type: "array", items: { type: "string" } } }, required: ["milestone_ids"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_live_data_by_event",
      description: "Live data for an event ticker.",
      parameters: { type: "object", properties: { event_ticker: { type: "string" }, params: { type: "object" } }, required: ["event_ticker"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_series",
      description: "List series templates (recurring events) — filter by category, tags, status, isInitialized.",
      parameters: { type: "object", properties: { params: { type: "object" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_tags_by_categories",
      description: "Tags organized by series categories.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_filters_by_sports",
      description: "Filter options organized by sports for sports-category markets.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_search_events",
      description: "Search prediction-market events by title or ticker.",
      parameters: { type: "object", properties: { query: { type: "string" }, params: { type: "object" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dflow_candlesticks",
      description: "OHLCV candles for a prediction market.",
      parameters: { type: "object", properties: { market_ticker: { type: "string" }, params: { type: "object" } }, required: ["market_ticker"] },
    },
  },
  // --- Token launching (pump.fun via PumpPortal) ---
  {
    type: "function",
    function: {
      name: "pump_launch_token",
      description: "Launch a new pump.fun SPL token. Uploads metadata to pump.fun IPFS, creates mint, signs locally with SOLANA_PRIVATE_KEY. Requires user confirmation and SOL balance.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          symbol: { type: "string" },
          description: { type: "string" },
          image_url: { type: "string" },
          twitter: { type: "string" },
          telegram: { type: "string" },
          website: { type: "string" },
          initial_buy_sol: { type: "number", description: "Creator dev buy amount in SOL" },
          slippage_bps: { type: "number" },
          priority_fee_sol: { type: "number" },
        },
        required: ["name", "symbol", "description"],
      },
    },
  },
  // --- DFlow priority fee WS ---
  {
    type: "function",
    function: {
      name: "dflow_priority_fees_stream",
      description: "Subscribe to DFlow priority fees websocket and collect N updates (default 1). Returns samples as JSON.",
      parameters: { type: "object", properties: { samples: { type: "number" }, timeout_ms: { type: "number" } }, required: [] },
    },
  },
  // --- Polymarket ---
  {
    type: "function",
    function: { name: "polymarket_events", description: "List Polymarket events (Gamma API, no auth). Params: limit, active, closed, order, ascending, tag_id, q.", parameters: { type: "object", properties: { params: { type: "object" } }, required: [] } },
  },
  { type: "function", function: { name: "polymarket_event", description: "Polymarket event by id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "polymarket_markets", description: "List Polymarket markets.", parameters: { type: "object", properties: { params: { type: "object" } }, required: [] } } },
  { type: "function", function: { name: "polymarket_market", description: "Polymarket market by id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "polymarket_search", description: "Search Polymarket events by query.", parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } } },
  { type: "function", function: { name: "polymarket_trending", description: "Trending Polymarket events by 24h volume.", parameters: { type: "object", properties: { limit: { type: "number" } }, required: [] } } },
  { type: "function", function: { name: "polymarket_tags", description: "Polymarket tags.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "polymarket_book", description: "Polymarket CLOB orderbook by token_id.", parameters: { type: "object", properties: { token_id: { type: "string" } }, required: ["token_id"] } } },
  { type: "function", function: { name: "polymarket_price", description: "Polymarket CLOB price by token_id. side=buy|sell.", parameters: { type: "object", properties: { token_id: { type: "string" }, side: { type: "string", enum: ["buy", "sell"] } }, required: ["token_id"] } } },
  { type: "function", function: { name: "polymarket_midpoint", description: "Midpoint price for a Polymarket token_id.", parameters: { type: "object", properties: { token_id: { type: "string" } }, required: ["token_id"] } } },
  { type: "function", function: { name: "polymarket_spread", description: "Spread for a Polymarket token_id.", parameters: { type: "object", properties: { token_id: { type: "string" } }, required: ["token_id"] } } },
  { type: "function", function: { name: "polymarket_trades", description: "Polymarket CLOB trade history for a market (condition id).", parameters: { type: "object", properties: { market: { type: "string" }, limit: { type: "number" } }, required: ["market"] } } },
  { type: "function", function: { name: "polymarket_last_trade_price", description: "Last trade price for a Polymarket token_id.", parameters: { type: "object", properties: { token_id: { type: "string" } }, required: ["token_id"] } } },
  { type: "function", function: { name: "polymarket_clob_markets", description: "CLOB markets list.", parameters: { type: "object", properties: { params: { type: "object" } }, required: [] } } },
  { type: "function", function: { name: "polymarket_clob_market", description: "CLOB market by condition_id.", parameters: { type: "object", properties: { condition_id: { type: "string" } }, required: ["condition_id"] } } },

  // --- Bags.fm ---
  {
    type: "function",
    function: {
      name: "bags_launch_token",
      description: "Launch a Solana token via Bags.fm with fee sharing. Requires BAGS_API_KEY and SOLANA_PRIVATE_KEY.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" }, symbol: { type: "string" }, description: { type: "string" },
          image_url: { type: "string" }, twitter: { type: "string" }, website: { type: "string" }, telegram: { type: "string" },
          initial_buy_sol: { type: "number" },
          fee_recipients: { type: "array", items: { type: "object", properties: { wallet: { type: "string" }, percentage: { type: "number" } } } },
        },
        required: ["name", "symbol", "description"],
      },
    },
  },
  { type: "function", function: { name: "bags_claim_fees", description: "Claim accumulated Bags.fm fees for the local wallet (optionally a specific position_key).", parameters: { type: "object", properties: { position_key: { type: "string" } }, required: [] } } },
  { type: "function", function: { name: "bags_swap", description: "Swap tokens via Bags.fm router.", parameters: { type: "object", properties: { input_mint: { type: "string" }, output_mint: { type: "string" }, amount: { type: "string" }, slippage_bps: { type: "number" } }, required: ["input_mint", "output_mint", "amount"] } } },
  { type: "function", function: { name: "bags_positions", description: "List Bags.fm positions for the local wallet.", parameters: { type: "object", properties: {}, required: [] } } },

  // --- Kalshi direct ---
  { type: "function", function: { name: "kalshi_balance", description: "Kalshi account balance. Requires KALSHI_KEY_ID and KALSHI_PRIVATE_KEY (PEM).", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "kalshi_positions", description: "Kalshi open positions.", parameters: { type: "object", properties: { params: { type: "object" } }, required: [] } } },
  { type: "function", function: { name: "kalshi_orders", description: "Kalshi orders list.", parameters: { type: "object", properties: { params: { type: "object" } }, required: [] } } },
  { type: "function", function: { name: "kalshi_fills", description: "Kalshi fills history.", parameters: { type: "object", properties: { params: { type: "object" } }, required: [] } } },
  { type: "function", function: { name: "kalshi_markets", description: "Kalshi markets list. Params: event_ticker, series_ticker, status, limit, cursor.", parameters: { type: "object", properties: { params: { type: "object" } }, required: [] } } },
  { type: "function", function: { name: "kalshi_market", description: "Kalshi market by ticker.", parameters: { type: "object", properties: { ticker: { type: "string" } }, required: ["ticker"] } } },
  { type: "function", function: { name: "kalshi_orderbook", description: "Kalshi orderbook for a market ticker.", parameters: { type: "object", properties: { ticker: { type: "string" }, depth: { type: "number" } }, required: ["ticker"] } } },
  {
    type: "function",
    function: {
      name: "kalshi_place_order",
      description: "Place a Kalshi order. Prices in cents (1-99). Requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          ticker: { type: "string" },
          side: { type: "string", enum: ["yes", "no"] },
          action: { type: "string", enum: ["buy", "sell"] },
          count: { type: "number" },
          type: { type: "string", enum: ["limit", "market"] },
          yes_price: { type: "number" },
          no_price: { type: "number" },
          time_in_force: { type: "string", enum: ["GTC", "IOC"] },
          client_order_id: { type: "string" },
        },
        required: ["ticker", "side", "action", "count", "type"],
      },
    },
  },
  { type: "function", function: { name: "kalshi_cancel_order", description: "Cancel a Kalshi order by id.", parameters: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] } } },

  {
    type: "function",
    function: {
      name: "pump_trade",
      description: "Buy or sell a pump.fun or Raydium token using PumpPortal local signing with SOLANA_PRIVATE_KEY.",
      parameters: {
        type: "object",
        properties: {
          mint: { type: "string" },
          action: { type: "string", enum: ["buy", "sell"] },
          amount: { type: "number", description: "SOL amount for buy (denominatedInSol=true), or token amount / percent string for sell" },
          denominated_in_sol: { type: "boolean" },
          slippage_bps: { type: "number" },
          priority_fee_sol: { type: "number" },
          pool: { type: "string", enum: ["pump", "raydium", "pump-amm", "auto"] },
        },
        required: ["mint", "action", "amount"],
      },
    },
  },
];

// Morph Fast Apply tool (conditional)
const MORPH_EDIT_TOOL: GrokTool = {
  type: "function",
  function: {
    name: "edit_file",
    description: "Use this tool to make an edit to an existing file.\n\nThis will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.\nWhen writing the edit, you should specify each edit in sequence, with the special comment // ... existing code ... to represent unchanged code in between edited lines.\n\nFor example:\n\n// ... existing code ...\nFIRST_EDIT\n// ... existing code ...\nSECOND_EDIT\n// ... existing code ...\nTHIRD_EDIT\n// ... existing code ...\n\nYou should still bias towards repeating as few lines of the original file as possible to convey the change.\nBut, each edit should contain sufficient context of unchanged lines around the code you're editing to resolve ambiguity.\nDO NOT omit spans of pre-existing code (or comments) without using the // ... existing code ... comment to indicate its absence. If you omit the existing code comment, the model may inadvertently delete these lines.\nIf you plan on deleting a section, you must provide context before and after to delete it. If the initial code is ```code \\n Block 1 \\n Block 2 \\n Block 3 \\n code```, and you want to remove Block 2, you would output ```// ... existing code ... \\n Block 1 \\n  Block 3 \\n // ... existing code ...```.\nMake sure it is clear what the edit should be, and where it should be applied.\nMake edits to a file in a single edit_file call instead of multiple edit_file calls to the same file. The apply model can handle many distinct edits at once.",
    parameters: {
      type: "object",
      properties: {
        target_file: {
          type: "string",
          description: "The target file to modify."
        },
        instructions: {
          type: "string",
          description: "A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist the less intelligent model in applying the edit. Use the first person to describe what you are going to do. Use it to disambiguate uncertainty in the edit."
        },
        code_edit: {
          type: "string",
          description: "Specify ONLY the precise lines of code that you wish to edit. NEVER specify or write out unchanged code. Instead, represent all unchanged code using the comment of the language you're editing in - example: // ... existing code ..."
        }
      },
      required: ["target_file", "instructions", "code_edit"]
    }
  }
};

// Function to build tools array conditionally
function buildGrokTools(): GrokTool[] {
  const tools = [...BASE_GROK_TOOLS];
  
  // Add Morph Fast Apply tool if API key is available
  if (process.env.MORPH_API_KEY) {
    tools.splice(3, 0, MORPH_EDIT_TOOL); // Insert after str_replace_editor
  }
  
  return tools;
}

// Export dynamic tools array
export const GROK_TOOLS: GrokTool[] = buildGrokTools();

// Global MCP manager instance
let mcpManager: MCPManager | null = null;

export function getMCPManager(): MCPManager {
  if (!mcpManager) {
    mcpManager = new MCPManager();
  }
  return mcpManager;
}

export async function initializeMCPServers(): Promise<void> {
  const manager = getMCPManager();
  const config = loadMCPConfig();
  
  // Store original stderr.write
  const originalStderrWrite = process.stderr.write;
  
  // Temporarily suppress stderr to hide verbose MCP connection logs
  process.stderr.write = function(chunk: any, encoding?: any, callback?: any): boolean {
    // Filter out mcp-remote verbose logs
    const chunkStr = chunk.toString();
    if (chunkStr.includes('[') && (
        chunkStr.includes('Using existing client port') ||
        chunkStr.includes('Connecting to remote server') ||
        chunkStr.includes('Using transport strategy') ||
        chunkStr.includes('Connected to remote server') ||
        chunkStr.includes('Local STDIO server running') ||
        chunkStr.includes('Proxy established successfully') ||
        chunkStr.includes('Local→Remote') ||
        chunkStr.includes('Remote→Local')
      )) {
      // Suppress these verbose logs
      if (callback) callback();
      return true;
    }
    
    // Allow other stderr output
    return originalStderrWrite.call(this, chunk, encoding, callback);
  };
  
  try {
    for (const serverConfig of config.servers) {
      try {
        await manager.addServer(serverConfig);
      } catch (error) {
        console.warn(`Failed to initialize MCP server ${serverConfig.name}:`, error);
      }
    }
  } finally {
    // Restore original stderr.write
    process.stderr.write = originalStderrWrite;
  }
}

export function convertMCPToolToGrokTool(mcpTool: MCPTool): GrokTool {
  return {
    type: "function",
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema || {
        type: "object",
        properties: {},
        required: []
      }
    }
  };
}

export function addMCPToolsToGrokTools(baseTools: GrokTool[]): GrokTool[] {
  if (!mcpManager) {
    return baseTools;
  }
  
  const mcpTools = mcpManager.getTools();
  const grokMCPTools = mcpTools.map(convertMCPToolToGrokTool);
  
  return [...baseTools, ...grokMCPTools];
}

export async function getAllGrokTools(): Promise<GrokTool[]> {
  const manager = getMCPManager();
  // Try to initialize servers if not already done, but don't block
  manager.ensureServersInitialized().catch(() => {
    // Ignore initialization errors to avoid blocking
  });
  return addMCPToolsToGrokTools(GROK_TOOLS);
}
