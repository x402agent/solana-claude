#!/usr/bin/env node

import chalk from 'chalk';
import {
  buildAgentMetadata,
  formatAgentError,
  inferNetwork,
  mintRegisteredAgent,
  readRegisteredAgent,
  type AgentServiceInput,
} from './metaplex-agent.js';

type Args = Record<string, string | boolean | string[]>;

function parseArgs(argv: string[]): { command: string; args: Args } {
  const [command = 'help', ...rest] = argv;
  const args: Args = {};

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]!;
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    const value = !next || next.startsWith('--') ? true : (i++, next);
    if (args[key] === undefined) {
      args[key] = value;
    } else if (Array.isArray(args[key])) {
      (args[key] as string[]).push(String(value));
    } else {
      args[key] = [String(args[key]), String(value)];
    }
  }

  return { command, args };
}

function str(args: Args, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}

function bool(args: Args, key: string): boolean {
  return args[key] === true || args[key] === 'true';
}

function list(args: Args, key: string): string[] {
  const value = args[key];
  if (!value) return [];
  return Array.isArray(value) ? value : [String(value)];
}

function parseServices(values: string[]): AgentServiceInput[] {
  return values.map((value) => {
    const [name, endpoint, version] = value.split('=');
    if (!name || !endpoint) {
      throw new Error(`Invalid --service "${value}". Use name=https://endpoint[/path]`);
    }
    return { name, endpoint, version };
  });
}

function requireArg(args: Args, key: string): string {
  const value = str(args, key);
  if (!value) throw new Error(`Missing required --${key}`);
  return value;
}

function usage(): void {
  process.stdout.write(`${chalk.cyanBright.bold('clawd-agent')}\n\n`);
  process.stdout.write('Mint and inspect Metaplex Agent Registry identities.\n\n');
  process.stdout.write(`${chalk.white.bold('Commands')}\n`);
  process.stdout.write('  mint       Mint a new MPL Core asset and register Agent Identity in one call\n');
  process.stdout.write('  read       Read a registered agent and derive its PDA wallet\n');
  process.stdout.write('  metadata   Generate EIP-8004 agent registration JSON\n\n');
  process.stdout.write(`${chalk.white.bold('Mint example')}\n`);
  process.stdout.write('  clawd-agent mint --network devnet --keypair ~/.config/solana/id.json \\\n');
  process.stdout.write('    --name "My AI Agent" --uri https://example.com/agent-nft.json \\\n');
  process.stdout.write('    --description "Autonomous Solana agent" --service MCP=https://example.com/mcp --yes\n\n');
}

async function main(): Promise<void> {
  const { command, args } = parseArgs(process.argv.slice(2));

  if (command === 'help' || command === '--help' || command === '-h') {
    usage();
    return;
  }

  if (command === 'metadata') {
    const metadata = buildAgentMetadata({
      name: requireArg(args, 'name'),
      description: requireArg(args, 'description'),
      image: str(args, 'image'),
      services: parseServices(list(args, 'service')),
      supportedTrust: list(args, 'trust'),
      x402Support: !bool(args, 'no-x402'),
    });
    process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`);
    return;
  }

  if (command === 'read') {
    const network = inferNetwork(str(args, 'network') ?? 'devnet');
    const result = await readRegisteredAgent({
      assetAddress: requireArg(args, 'asset'),
      rpcUrl: str(args, 'rpc'),
      network,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'mint') {
    const network = inferNetwork(str(args, 'network') ?? 'devnet');
    if (network === 'solana-mainnet' && !bool(args, 'yes')) {
      throw new Error('Mainnet mint requires --yes. Devnet is the default for first runs.');
    }
    if (!bool(args, 'yes')) {
      throw new Error('Minting creates a real on-chain agent. Pass --yes to submit the transaction.');
    }

    const result = await mintRegisteredAgent({
      keypairPath: requireArg(args, 'keypair'),
      rpcUrl: str(args, 'rpc'),
      network,
      name: requireArg(args, 'name'),
      uri: requireArg(args, 'uri'),
      description: requireArg(args, 'description'),
      image: str(args, 'image'),
      services: parseServices(list(args, 'service')),
      supportedTrust: list(args, 'trust'),
      x402Support: !bool(args, 'no-x402'),
      baseUrl: str(args, 'api-base-url'),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown command "${command}"`);
}

main().catch((err) => {
  process.stderr.write(`${chalk.red('error:')} ${formatAgentError(err)}\n`);
  process.exit(1);
});
