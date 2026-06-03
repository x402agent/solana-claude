import type { AgentConfig } from './config.js';
import type { Session } from './session.js';
import { BirdeyeClient, BirdeyeError, isSolanaAddress } from './birdeye.js';
import {
  formatTokenOverview,
  formatTrending,
  formatSearch,
  formatPortfolio,
  formatNetworth,
  formatError,
  summarizePortfolio,
} from './format-token.js';
import { HeliusClient } from './helius.js';
import {
  formatAsset,
  formatAssetsByOwner,
  formatNftsByOwner,
  formatSignatures,
  formatHolders,
  formatBalance,
  formatError as formatHeliusError,
} from './format-helius.js';
import {
  ResearchClient,
  ResearchError,
  type ChainResearchPayload,
  type DefiResearchPayload,
  type MarketResearchPayload,
  type AutoloopMandate,
} from './research.js';
import { DeepSeekClient, DeepSeekError, type DeepSeekChatMessage } from './deepseek.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ORANGE = '\x1b[38;5;215m';
const GRAY = '\x1b[90m';

export interface CommandContext {
  config: AgentConfig;
  session: Session;
  newSession: () => Session;
}

export interface CommandResult {
  handled: boolean;
  exit?: boolean;
}

interface Command {
  name: string;
  description: string;
  run(ctx: CommandContext, args: string[]): CommandResult | Promise<CommandResult>;
}

function birdeye(ctx: CommandContext): BirdeyeClient | null {
  if (!ctx.config.birdeyeApiKey) {
    process.stdout.write(formatError('birdeye', 'BIRDEYE_API_KEY is not set. Add it to .env'));
    return null;
  }
  return new BirdeyeClient({ apiKey: ctx.config.birdeyeApiKey });
}

function helius(ctx: CommandContext): HeliusClient | null {
  if (!ctx.config.heliusApiKey) {
    process.stdout.write(formatHeliusError('helius', 'HELIUS_API_KEY is not set. Add it to .env'));
    return null;
  }
  return new HeliusClient({
    apiKey: ctx.config.heliusApiKey,
    rpcUrl: ctx.config.heliusRpcUrl || undefined,
  });
}

function research(ctx: CommandContext): ResearchClient {
  return new ResearchClient({
    baseUrl: ctx.config.researchApiUrl || 'http://localhost:8000',
  });
}

function deepseek(ctx: CommandContext): DeepSeekClient | null {
  if (!ctx.config.deepseekApiKey) {
    console.log(`\n  ${DIM}DEEPSEEK_API_KEY is not set. Add it to .env or export it.${RESET}\n`);
    return null;
  }
  return new DeepSeekClient({
    apiKey: ctx.config.deepseekApiKey,
    baseUrl: ctx.config.deepseekBaseUrl,
    defaultModel: ctx.config.deepseekModel,
  });
}

function previewJson(value: unknown, max = 1200): string {
  const text = JSON.stringify(value, null, 2);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n${DIM}…(${text.length - max} chars truncated; persisted to research_runs)${RESET}`;
}

const COMMANDS: Command[] = [
  {
    name: '/help',
    description: 'List available slash commands',
    run() {
      console.log(`\n  ${BOLD}Commands${RESET}`);
      for (const cmd of COMMANDS) {
        console.log(`  ${ORANGE}${cmd.name.padEnd(14)}${RESET}${DIM}${cmd.description}${RESET}`);
      }
      console.log(`  ${ORANGE}${'exit'.padEnd(14)}${RESET}${DIM}Quit Clawd${RESET}\n`);
      return { handled: true };
    },
  },
  {
    name: '/model',
    description: 'Switch the active OpenRouter model (usage: /model <id>)',
    run(ctx, args) {
      if (args.length === 0) {
        console.log(`\n  ${DIM}current model:${RESET} ${ORANGE}${ctx.config.model}${RESET}`);
        console.log(`  ${DIM}usage: /model <id>  (e.g. anthropic/claude-opus-4.7)${RESET}\n`);
      } else {
        ctx.config.model = args[0];
        console.log(`\n  ${DIM}switched to${RESET} ${ORANGE}${ctx.config.model}${RESET}\n`);
      }
      return { handled: true };
    },
  },
  {
    name: '/new',
    description: 'Start a fresh conversation (clears history)',
    run(ctx) {
      ctx.newSession();
      console.log(`\n  ${DIM}started a new session${RESET}\n`);
      return { handled: true };
    },
  },
  {
    name: '/session',
    description: 'Show session id, message count, and token usage',
    run(ctx) {
      const usage = ctx.session.getUsage();
      const messages = ctx.session.getMessages().length;
      console.log(`\n  ${BOLD}Session${RESET}`);
      console.log(`  ${DIM}id       ${RESET}${GRAY}${ctx.session.id}${RESET}`);
      console.log(`  ${DIM}file     ${RESET}${GRAY}${ctx.session.path}${RESET}`);
      console.log(`  ${DIM}messages ${RESET}${messages}`);
      console.log(`  ${DIM}tokens   ${RESET}${usage.input} in · ${usage.output} out\n`);
      return { handled: true };
    },
  },
  {
    name: '/trending',
    description: 'Top trending Solana tokens (usage: /trending [limit])',
    async run(ctx, args) {
      const client = birdeye(ctx);
      if (!client) return { handled: true };
      const limit = Math.min(50, Math.max(1, Number(args[0]) || 15));
      try {
        const data = await client.trending(limit);
        const items = data.tokens ?? [];
        process.stdout.write(formatTrending(items, limit));
      } catch (err) {
        process.stdout.write(formatError('/trending', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/search',
    description: 'Search Solana tokens by symbol/name (usage: /search <query>)',
    async run(ctx, args) {
      if (args.length === 0) {
        console.log(`\n  ${DIM}usage: /search <query>${RESET}\n`);
        return { handled: true };
      }
      const client = birdeye(ctx);
      if (!client) return { handled: true };
      const query = args.join(' ');
      try {
        const data = await client.search(query, 10);
        const tokens = (data.items ?? [])
          .filter((g) => g.type === 'token')
          .flatMap((g) => g.result ?? []);
        process.stdout.write(formatSearch(tokens, query));
      } catch (err) {
        process.stdout.write(formatError('/search', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/wallet',
    description: 'Inspect a Solana wallet (usage: /wallet <address>)',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /wallet <solana-address>${RESET}\n`);
        return { handled: true };
      }
      const client = birdeye(ctx);
      if (!client) return { handled: true };
      try {
        const data = await client.walletPortfolio(args[0]);
        const summary = summarizePortfolio(args[0], data.items ?? []);
        process.stdout.write(formatPortfolio(summary, 10));
      } catch (err) {
        process.stdout.write(formatError('/wallet', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/portfolio',
    description: 'Full token holdings for a wallet (usage: /portfolio <address>)',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /portfolio <solana-address>${RESET}\n`);
        return { handled: true };
      }
      const client = birdeye(ctx);
      if (!client) return { handled: true };
      try {
        const data = await client.walletPortfolio(args[0]);
        const summary = summarizePortfolio(args[0], data.items ?? []);
        process.stdout.write(formatPortfolio(summary, 30));
      } catch (err) {
        process.stdout.write(formatError('/portfolio', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/networth',
    description: 'Total USD net worth for a wallet (usage: /networth <address>)',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /networth <solana-address>${RESET}\n`);
        return { handled: true };
      }
      const client = birdeye(ctx);
      if (!client) return { handled: true };
      try {
        const data = await client.walletPortfolio(args[0]);
        const summary = summarizePortfolio(args[0], data.items ?? []);
        process.stdout.write(formatNetworth(summary));
      } catch (err) {
        process.stdout.write(formatError('/networth', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/asset',
    description: 'Helius DAS — fetch a single asset/NFT/token by mint (usage: /asset <id>)',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /asset <mint-or-asset-id>${RESET}\n`);
        return { handled: true };
      }
      const client = helius(ctx);
      if (!client) return { handled: true };
      try {
        const asset = await client.getAsset(args[0]);
        process.stdout.write(formatAsset(asset));
      } catch (err) {
        process.stdout.write(formatHeliusError('/asset', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/assets',
    description: 'Helius DAS — all assets (NFTs + tokens) for a wallet (usage: /assets <address> [page])',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /assets <solana-address> [page]${RESET}\n`);
        return { handled: true };
      }
      const client = helius(ctx);
      if (!client) return { handled: true };
      const page = Math.max(1, Number(args[1]) || 1);
      try {
        const list = await client.getAssetsByOwner({ ownerAddress: args[0], page, limit: 100 });
        process.stdout.write(formatAssetsByOwner(args[0], list));
      } catch (err) {
        process.stdout.write(formatHeliusError('/assets', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/nfts',
    description: 'Helius DAS — NFTs (regular + compressed) for a wallet (usage: /nfts <address>)',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /nfts <solana-address>${RESET}\n`);
        return { handled: true };
      }
      const client = helius(ctx);
      if (!client) return { handled: true };
      try {
        const list = await client.searchAssets({
          ownerAddress: args[0],
          tokenType: 'nonFungible',
          limit: 100,
        });
        process.stdout.write(formatNftsByOwner(args[0], list));
      } catch (err) {
        process.stdout.write(formatHeliusError('/nfts', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/holders',
    description: 'Helius RPC — top holders + supply for a token mint (usage: /holders <mint>)',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /holders <mint-address>${RESET}\n`);
        return { handled: true };
      }
      const client = helius(ctx);
      if (!client) return { handled: true };
      try {
        const [supply, accounts] = await Promise.all([
          client.getTokenSupply(args[0]),
          client.getTokenLargestAccounts(args[0]),
        ]);
        process.stdout.write(formatHolders(args[0], supply, accounts));
      } catch (err) {
        process.stdout.write(formatHeliusError('/holders', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/sigs',
    description: 'Helius DAS — recent transaction signatures for a compressed asset (usage: /sigs <id>)',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /sigs <asset-id>${RESET}\n`);
        return { handled: true };
      }
      const client = helius(ctx);
      if (!client) return { handled: true };
      try {
        const sigs = await client.getSignaturesForAsset(args[0]);
        process.stdout.write(formatSignatures(args[0], sigs));
      } catch (err) {
        process.stdout.write(formatHeliusError('/sigs', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/balance',
    description: 'Helius RPC — native SOL balance for a wallet (usage: /balance <address>)',
    async run(ctx, args) {
      if (args.length === 0 || !isSolanaAddress(args[0])) {
        console.log(`\n  ${DIM}usage: /balance <solana-address>${RESET}\n`);
        return { handled: true };
      }
      const client = helius(ctx);
      if (!client) return { handled: true };
      try {
        const res = await client.getBalance(args[0]);
        process.stdout.write(formatBalance(args[0], res.value));
      } catch (err) {
        process.stdout.write(formatHeliusError('/balance', (err as Error).message));
      }
      return { handled: true };
    },
  },
  {
    name: '/research',
    description: 'Run a one-shot AutoResearch query (usage: /research <chain|defi|market> [args])',
    async run(ctx, args) {
      const usage = `\n  ${DIM}usage:${RESET}\n` +
        `    /research chain pump_fun                ${DIM}— trending + new launches${RESET}\n` +
        `    /research chain token <mint>            ${DIM}— deep dive on a mint${RESET}\n` +
        `    /research chain wallet <address>        ${DIM}— wallet portfolio + DAS${RESET}\n` +
        `    /research chain graduation <mint>       ${DIM}— bonding-curve progress${RESET}\n` +
        `    /research defi yields [SOL,USDC,...]    ${DIM}— yield scan${RESET}\n` +
        `    /research defi arbitrage <mint>         ${DIM}— cross-pool spreads${RESET}\n` +
        `    /research market trends                 ${DIM}— top 30 trending${RESET}\n` +
        `    /research market alpha                  ${DIM}— new ∩ momentum${RESET}\n` +
        `    /research market whales [mint]          ${DIM}— largest holders${RESET}\n` +
        `    /research runs [kind] [limit]           ${DIM}— recent persisted runs${RESET}\n`;
      if (args.length === 0) {
        console.log(usage);
        return { handled: true };
      }
      const client = research(ctx);
      const [kind, sub, ...rest] = args;
      try {
        if (kind === 'chain') {
          let payload: ChainResearchPayload;
          if (sub === 'pump_fun' || !sub) {
            payload = { query: 'pump.fun pulse', focus: ['pump_fun'], limit: 30 };
          } else if (sub === 'token' && rest[0]) {
            payload = { query: `token ${rest[0]}`, focus: ['tokens'], mint: rest[0] };
          } else if (sub === 'wallet' && rest[0]) {
            payload = { query: `wallet ${rest[0]}`, focus: ['wallets'], wallet: rest[0] };
          } else if (sub === 'graduation' && rest[0]) {
            payload = { query: `graduation ${rest[0]}`, focus: ['graduation'], mint: rest[0] };
          } else {
            console.log(usage);
            return { handled: true };
          }
          const res = await client.chain(payload);
          console.log(`\n  ${BOLD}${ORANGE}research/chain${RESET} ${DIM}id=${res.id} agent=${res.agent} sources=${res.sources.join(',')} conf=${res.confidence}${RESET}`);
          console.log(previewJson(res.results));
        } else if (kind === 'defi') {
          let payload: DefiResearchPayload;
          if (sub === 'yields') {
            const assets = rest[0] ? rest[0].split(',') : ['SOL', 'USDC'];
            payload = { action: 'yield_scan', assets };
          } else if (sub === 'arbitrage' && rest[0]) {
            payload = { action: 'arbitrage', assets: [rest[0]] };
          } else {
            console.log(usage);
            return { handled: true };
          }
          const res = await client.defi(payload);
          console.log(`\n  ${BOLD}${ORANGE}research/defi${RESET} ${DIM}id=${res.id} sources=${res.sources.join(',')}${RESET}`);
          console.log(previewJson(res.results));
        } else if (kind === 'market') {
          let payload: MarketResearchPayload;
          if (sub === 'trends' || !sub) payload = { focus: 'trends' };
          else if (sub === 'alpha') payload = { focus: 'alpha' };
          else if (sub === 'whales') payload = { focus: 'whale_moves', tokens: rest[0] ? [rest[0]] : [] };
          else if (sub === 'sentiment') payload = { focus: 'sentiment' };
          else { console.log(usage); return { handled: true }; }
          const res = await client.market(payload);
          console.log(`\n  ${BOLD}${ORANGE}research/market${RESET} ${DIM}id=${res.id} sources=${res.sources.join(',')}${RESET}`);
          console.log(previewJson(res.results));
        } else if (kind === 'runs') {
          const subKind = sub && !/^\d+$/.test(sub) ? sub : undefined;
          const limit = subKind ? Number(rest[0] || 20) : Number(sub || 20);
          const { runs } = await client.listRuns(subKind, Number.isFinite(limit) ? limit : 20);
          console.log(`\n  ${BOLD}recent runs${RESET} ${DIM}(${runs.length})${RESET}`);
          for (const r of runs) {
            console.log(`  ${ORANGE}${r.kind.padEnd(8)}${RESET} ${DIM}${r.created_at ?? ''}${RESET}  ${r.id}  ${r.query}`);
          }
        } else {
          console.log(usage);
        }
      } catch (err) {
        const msg = err instanceof ResearchError ? err.message : (err as Error).message;
        console.log(`\n  ${DIM}/research failed:${RESET} ${msg}`);
        console.log(`  ${DIM}is the AutoResearch API running at ${ctx.config.researchApiUrl || 'http://localhost:8000'}? set RESEARCH_API_URL to override.${RESET}\n`);
      }
      return { handled: true };
    },
  },
  {
    name: '/deepseek',
    description: 'Direct DeepSeek chat with thinking mode (usage: /deepseek <prompt>)',
    async run(ctx, args) {
      if (args.length === 0) {
        console.log(`\n  ${DIM}usage: /deepseek <prompt>${RESET}`);
        console.log(`  ${DIM}model: ${ORANGE}${ctx.config.deepseekModel}${RESET} ${DIM}(set DEEPSEEK_MODEL to override)${RESET}\n`);
        return { handled: true };
      }
      const client = deepseek(ctx);
      if (!client) return { handled: true };
      const prompt = args.join(' ');
      const messages: DeepSeekChatMessage[] = [{ role: 'user', content: prompt }];
      console.log(`\n  ${BOLD}${ORANGE}deepseek${RESET} ${DIM}${ctx.config.deepseekModel}${RESET}`);
      let inReasoning = false;
      let inText = false;
      let usage: { prompt_tokens?: number; completion_tokens?: number; prompt_cache_hit_tokens?: number } | undefined;
      try {
        for await (const evt of client.chatStream({ messages })) {
          if (evt.type === 'reasoning' && evt.delta) {
            if (!inReasoning) {
              process.stdout.write(`\n  ${DIM}reasoning…${RESET}\n  ${GRAY}`);
              inReasoning = true;
            }
            process.stdout.write(evt.delta.replace(/\n/g, '\n  '));
          } else if (evt.type === 'text' && evt.delta) {
            if (inReasoning) {
              process.stdout.write(`${RESET}\n`);
              inReasoning = false;
            }
            if (!inText) {
              process.stdout.write(`\n  `);
              inText = true;
            }
            process.stdout.write(evt.delta.replace(/\n/g, '\n  '));
          } else if (evt.type === 'usage' && evt.usage) {
            usage = evt.usage;
          } else if (evt.type === 'error') {
            console.log(`\n  ${DIM}stream error: ${evt.error}${RESET}`);
          }
        }
        if (inReasoning) process.stdout.write(RESET);
        process.stdout.write('\n');
        if (usage) {
          const inT = usage.prompt_tokens ?? 0;
          const outT = usage.completion_tokens ?? 0;
          const cached = usage.prompt_cache_hit_tokens ?? 0;
          const cachedHint = cached ? ` ${DIM}(${cached} cached)${RESET}` : '';
          console.log(`${GRAY}  ${inT} in${RESET}${cachedHint}${GRAY} · ${outT} out${RESET}\n`);
        } else {
          console.log('');
        }
      } catch (err) {
        const msg = err instanceof DeepSeekError ? err.message : (err as Error).message;
        const body = err instanceof DeepSeekError && err.body ? `\n  ${DIM}${err.body}${RESET}` : '';
        console.log(`\n  ${DIM}/deepseek failed:${RESET} ${msg}${body}\n`);
      }
      return { handled: true };
    },
  },
  {
    name: '/deepseek-fim',
    description: 'DeepSeek FIM completion — fill in the middle (usage: /deepseek-fim <prefix> -- <suffix>)',
    async run(ctx, args) {
      if (args.length === 0) {
        console.log(`\n  ${DIM}usage: /deepseek-fim <prefix> [-- <suffix>]${RESET}\n`);
        return { handled: true };
      }
      const client = deepseek(ctx);
      if (!client) return { handled: true };
      const sepIdx = args.indexOf('--');
      const prefix = (sepIdx >= 0 ? args.slice(0, sepIdx) : args).join(' ');
      const suffix = sepIdx >= 0 ? args.slice(sepIdx + 1).join(' ') : undefined;
      try {
        const res = await client.fim({ prompt: prefix, suffix: suffix ?? null, max_tokens: 1024 });
        const text = res.choices[0]?.text ?? '';
        console.log(`\n  ${BOLD}${ORANGE}fim${RESET} ${DIM}${res.model}${RESET}`);
        console.log(`  ${prefix}${ORANGE}${text}${RESET}${suffix ? suffix : ''}\n`);
        if (res.usage) {
          console.log(`${GRAY}  ${res.usage.prompt_tokens ?? 0} in · ${res.usage.completion_tokens ?? 0} out${RESET}\n`);
        }
      } catch (err) {
        const msg = err instanceof DeepSeekError ? err.message : (err as Error).message;
        console.log(`\n  ${DIM}/deepseek-fim failed:${RESET} ${msg}\n`);
      }
      return { handled: true };
    },
  },
  {
    name: '/deepseek-balance',
    description: 'Show DeepSeek account balance',
    async run(ctx) {
      const client = deepseek(ctx);
      if (!client) return { handled: true };
      try {
        const res = await client.getBalance();
        console.log(`\n  ${BOLD}DeepSeek balance${RESET}  ${res.is_available ? `${ORANGE}available${RESET}` : `${DIM}unavailable${RESET}`}`);
        for (const b of res.balance_infos) {
          console.log(`  ${ORANGE}${b.currency.padEnd(5)}${RESET} ${DIM}total${RESET} ${b.total_balance}  ${DIM}granted${RESET} ${b.granted_balance}  ${DIM}topped${RESET} ${b.topped_up_balance}`);
        }
        console.log('');
      } catch (err) {
        const msg = err instanceof DeepSeekError ? err.message : (err as Error).message;
        console.log(`\n  ${DIM}/deepseek-balance failed:${RESET} ${msg}\n`);
      }
      return { handled: true };
    },
  },
  {
    name: '/deepseek-models',
    description: 'List available DeepSeek models',
    async run(ctx) {
      const client = deepseek(ctx);
      if (!client) return { handled: true };
      try {
        const res = await client.listModels();
        console.log(`\n  ${BOLD}DeepSeek models${RESET} ${DIM}(${res.data.length})${RESET}`);
        for (const m of res.data) {
          const owned = m.owned_by ? ` ${DIM}${m.owned_by}${RESET}` : '';
          console.log(`  ${ORANGE}${m.id}${RESET}${owned}`);
        }
        console.log('');
      } catch (err) {
        const msg = err instanceof DeepSeekError ? err.message : (err as Error).message;
        console.log(`\n  ${DIM}/deepseek-models failed:${RESET} ${msg}\n`);
      }
      return { handled: true };
    },
  },
  {
    name: '/autoloop',
    description: 'Manage the autonomous research loop (usage: /autoloop <start|stop|status|add|list|remove>)',
    async run(ctx, args) {
      const usage = `\n  ${DIM}usage:${RESET}\n` +
        `    /autoloop start                                     ${DIM}— begin background research ticks${RESET}\n` +
        `    /autoloop stop                                      ${DIM}— halt the loop${RESET}\n` +
        `    /autoloop status                                    ${DIM}— show running state + recent errors${RESET}\n` +
        `    /autoloop list                                      ${DIM}— show mandates${RESET}\n` +
        `    /autoloop add <name> <chain|defi|market> <json>     ${DIM}— add/update a mandate${RESET}\n` +
        `    /autoloop remove <name>                             ${DIM}— delete a mandate${RESET}\n`;
      const [sub, ...rest] = args;
      const client = research(ctx);
      try {
        if (!sub) { console.log(usage); return { handled: true }; }
        if (sub === 'start') {
          const r = await client.startAutoloop();
          console.log(`\n  ${ORANGE}autoloop running${RESET} ${DIM}interval=${r.interval_seconds}s newly_started=${r.newly_started}${RESET}\n`);
        } else if (sub === 'stop') {
          await client.stopAutoloop();
          console.log(`\n  ${DIM}autoloop stopped${RESET}\n`);
        } else if (sub === 'status') {
          const s = await client.autoloopStatus();
          console.log(`\n  ${BOLD}autoloop${RESET}  ${s.running ? `${ORANGE}running${RESET}` : `${DIM}stopped${RESET}`}`);
          console.log(`  ${DIM}last_tick=${s.last_tick ?? '—'}  ticks=${s.tick_count}  interval=${s.interval_seconds}s${RESET}`);
          for (const m of s.mandates) {
            const flag = m.enabled === false ? `${DIM}disabled${RESET}` : '';
            console.log(`  ${ORANGE}${m.name.padEnd(20)}${RESET} ${m.kind.padEnd(8)} ${flag} ${DIM}${JSON.stringify(m.payload)}${RESET}`);
          }
          if (s.recent_errors.length) {
            console.log(`  ${DIM}recent errors:${RESET}`);
            for (const e of s.recent_errors) console.log(`    ${DIM}${e}${RESET}`);
          }
          console.log('');
        } else if (sub === 'list') {
          const { mandates } = await client.listMandates();
          for (const m of mandates) {
            console.log(`  ${ORANGE}${m.name.padEnd(20)}${RESET} ${m.kind.padEnd(8)} ${DIM}${JSON.stringify(m.payload)}${RESET}`);
          }
        } else if (sub === 'add' && rest.length >= 3) {
          const [name, kind, ...jsonParts] = rest;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(jsonParts.join(' '));
          } catch {
            console.log(`\n  ${DIM}payload must be JSON, e.g. {"focus":"alpha"}${RESET}\n`);
            return { handled: true };
          }
          const mandate: AutoloopMandate = { name, kind: kind as AutoloopMandate['kind'], payload, enabled: true };
          await client.addMandate(mandate);
          console.log(`\n  ${ORANGE}mandate added:${RESET} ${name}\n`);
        } else if (sub === 'remove' && rest[0]) {
          await client.removeMandate(rest[0]);
          console.log(`\n  ${DIM}mandate removed: ${rest[0]}${RESET}\n`);
        } else {
          console.log(usage);
        }
      } catch (err) {
        const msg = err instanceof ResearchError ? err.message : (err as Error).message;
        console.log(`\n  ${DIM}/autoloop failed:${RESET} ${msg}\n`);
      }
      return { handled: true };
    },
  },
];

export async function handleCommand(
  input: string,
  ctx: CommandContext,
): Promise<CommandResult> {
  if (!input.startsWith('/')) return { handled: false };
  const [name, ...args] = input.split(/\s+/);
  const cmd = COMMANDS.find((c) => c.name === name);
  if (!cmd) {
    console.log(`\n  ${DIM}unknown command: ${name}. Try /help.${RESET}\n`);
    return { handled: true };
  }
  return cmd.run(ctx, args);
}

export function listCommands(): readonly { name: string; description: string }[] {
  return COMMANDS.map(({ name, description }) => ({ name, description }));
}

// Auto-analysis when a Solana contract address is pasted into the prompt.
// Returns true if the input was handled as an inline analysis (no agent call).
export async function maybeAnalyzeAddress(
  input: string,
  ctx: CommandContext,
): Promise<boolean> {
  const trimmed = input.trim();
  if (!isSolanaAddress(trimmed)) return false;
  if (!ctx.config.birdeyeApiKey && !ctx.config.heliusApiKey) return false;

  process.stdout.write(`\n  ${DIM}detected solana address — fetching live data…${RESET}\n`);

  const tasks: Promise<unknown>[] = [];
  let birdeyeOk = false;

  if (ctx.config.birdeyeApiKey) {
    const bird = new BirdeyeClient({ apiKey: ctx.config.birdeyeApiKey });
    tasks.push(
      bird
        .tokenOverview(trimmed)
        .then((data) => {
          birdeyeOk = true;
          process.stdout.write(formatTokenOverview(data));
        })
        .catch((err) => {
          if (err instanceof BirdeyeError && (err.status === 404 || err.status === 400)) return;
          process.stdout.write(formatError('birdeye', (err as Error).message));
        }),
    );
  }

  if (ctx.config.heliusApiKey) {
    const hel = new HeliusClient({
      apiKey: ctx.config.heliusApiKey,
      rpcUrl: ctx.config.heliusRpcUrl || undefined,
    });
    tasks.push(
      hel
        .getAsset(trimmed)
        .then((asset) => {
          // For pure-fungible tokens already covered by Birdeye, only show Helius
          // when it adds something (NFT, compressed asset, or no Birdeye match).
          const isFungible = asset.interface === 'FungibleToken' || asset.interface === 'FungibleAsset';
          if (!birdeyeOk || !isFungible) {
            process.stdout.write(formatAsset(asset));
          }
        })
        .catch(() => {
          // Asset may not exist on DAS (non-asset wallet address). Stay silent.
        }),
    );
  }

  await Promise.all(tasks);
  return true;
}
