import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

// Tiny .env loader. Looks for KEY=VALUE lines, ignores comments + blanks,
// and never overwrites an env var that's already set in the shell.
// Search order (first match wins for a given key, shell still wins overall):
//   1. ./.env in cwd
//   2. ~/.clawd.env
//   3. ~/.config/openclawd/.env
function loadDotenvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(homedir(), '.clawd.env'),
    resolve(homedir(), '.config', 'openclawd', '.env'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    let content: string;
    try {
      content = readFileSync(path, 'utf-8');
    } catch {
      continue;
    }
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

export interface DisplayConfig {
  toolDisplay: 'emoji' | 'grouped' | 'minimal' | 'hidden';
  reasoning: boolean;
  inputStyle: 'block' | 'bordered' | 'plain';
}

export interface AgentConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  maxSteps: number;
  maxCost: number;
  sessionDir: string;
  showBanner: boolean;
  display: DisplayConfig;
  slashCommands: boolean;
  requireApproval: string[];
  loaderText: string;
  birdeyeApiKey: string;
  heliusApiKey: string;
  heliusRpcUrl: string;
  researchApiUrl: string;
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
}

const DEFAULTS: AgentConfig = {
  apiKey: '',
  model: 'anthropic/claude-opus-4.7',
  systemPrompt: [
    'You are Clawd, a lobster-themed coding assistant with tools for reading, writing, editing, and searching files, and running shell commands.',
    '',
    'Current working directory: {cwd}',
    '',
    'Guidelines:',
    '- Use your tools proactively. Explore the codebase to find answers instead of asking the user.',
    '- Keep working until the task is fully resolved before responding.',
    '- Do not guess or make up information — use your tools to verify.',
    '- Be concise and direct.',
    '- Show file paths clearly when working with files.',
    '- Prefer grep and glob tools over shell commands for file search.',
    '- When editing code, make minimal targeted changes consistent with the existing style.',
  ].join('\n'),
  maxSteps: 20,
  maxCost: 1.0,
  sessionDir: '.sessions',
  showBanner: true,
  display: { toolDisplay: 'grouped', reasoning: false, inputStyle: 'block' },
  slashCommands: true,
  requireApproval: ['shell', 'file_write', 'file_edit'],
  loaderText: 'Clawing',
  birdeyeApiKey: '',
  heliusApiKey: '',
  heliusRpcUrl: '',
  researchApiUrl: '',
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com',
  deepseekModel: 'deepseek-v4-pro',
};

export function loadConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  loadDotenvFiles();
  let config = { ...DEFAULTS };

  const configPath = resolve('agent.config.json');
  if (existsSync(configPath)) {
    const file = JSON.parse(readFileSync(configPath, 'utf-8'));
    if (file.display) {
      config.display = { ...config.display, ...file.display };
    }
    config = { ...config, ...file, display: config.display };
  }

  if (process.env.OPENROUTER_API_KEY) config.apiKey = process.env.OPENROUTER_API_KEY;
  if (process.env.AGENT_MODEL) config.model = process.env.AGENT_MODEL;
  if (process.env.AGENT_MAX_STEPS) config.maxSteps = Number(process.env.AGENT_MAX_STEPS);
  if (process.env.AGENT_MAX_COST) config.maxCost = Number(process.env.AGENT_MAX_COST);
  if (process.env.BIRDEYE_API_KEY) config.birdeyeApiKey = process.env.BIRDEYE_API_KEY;
  if (process.env.HELIUS_API_KEY) config.heliusApiKey = process.env.HELIUS_API_KEY;
  if (process.env.HELIUS_RPC_URL) config.heliusRpcUrl = process.env.HELIUS_RPC_URL;
  if (process.env.RESEARCH_API_URL) config.researchApiUrl = process.env.RESEARCH_API_URL;
  if (process.env.OPENCLAWD_RESEARCH_URL) config.researchApiUrl = process.env.OPENCLAWD_RESEARCH_URL;
  if (process.env.DEEPSEEK_API_KEY) config.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  if (process.env.DEEPSEEK_BASE_URL) config.deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL;
  if (process.env.DEEPSEEK_MODEL) config.deepseekModel = process.env.DEEPSEEK_MODEL;
  if (process.env.CLAWD_SESSION_DIR) config.sessionDir = process.env.CLAWD_SESSION_DIR;
  if (process.env.CLAWD_SYSTEM_PROMPT_APPEND) {
    config.systemPrompt = `${config.systemPrompt}\n\n${process.env.CLAWD_SYSTEM_PROMPT_APPEND}`;
  }

  if (overrides.display) {
    config.display = { ...config.display, ...overrides.display };
  }
  config = { ...config, ...overrides, display: config.display };
  return config;
}
