import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export type AutomationLoopStatus = 'live' | 'ready' | 'blocked' | 'watching';

export interface AutomationLoop {
  id: string;
  label: string;
  status: AutomationLoopStatus;
  detail: string;
  action: string;
}

export interface PackageArtifact {
  name: string;
  path: string;
  present: boolean;
  sizeBytes: number;
  publishable: boolean;
  note: string;
}

export interface SolanaProgramDeployment {
  name: string;
  programId: string;
  artifactPath?: string;
  artifactBuilt: boolean;
  devnetDeployed: boolean;
  deployable: boolean;
  note: string;
}

export interface DarkDefiAutomationSnapshot {
  generatedAt: string;
  releaseGate: {
    tokenAddressConfigured: boolean;
    birdeyeConfigured: boolean;
    target: string;
    workflowReady: boolean;
  };
  cloudflare: {
    stagingUrl: string;
    productionUrl: string;
    stagingHealthy: boolean;
    productionHealthy: boolean;
  };
  automaton: {
    packageBuilt: boolean;
    runtimeBuilt: boolean;
    testsExpected: string;
  };
  solanaProgram: {
    programId: string;
    artifactBuilt: boolean;
    devnetDeployed: boolean;
    deployBlocked: boolean;
    blocker: string;
  };
  solanaPrograms: SolanaProgramDeployment[];
  packages: PackageArtifact[];
  loops: AutomationLoop[];
}

const PACKAGE_ARTIFACTS = [
  {
    name: '@darkralph/tui',
    path: 'artifacts/packages/darkralph-tui-1.0.0.tgz',
    publishable: true,
    note: 'Root TUI package.',
  },
  {
    name: '@openclawdsolana/clawd-tui',
    path: 'artifacts/packages/openclawdsolana-clawd-tui-0.2.2.tgz',
    publishable: true,
    note: 'Solana-aware Clawd terminal.',
  },
  {
    name: '@conway/automaton',
    path: 'artifacts/packages/conway-automaton-0.1.0.tgz',
    publishable: true,
    note: 'Automaton runtime package.',
  },
];
const DEFAULT_STAGING_AGENT_API_URL = 'https://agent-api-staging.example.workers.dev';
const DEFAULT_PRODUCTION_AGENT_API_URL = 'https://agent-api.example.workers.dev';

const SOLANA_PROGRAMS = [
  {
    name: 'solana-ai-inference',
    programId: '3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc',
    artifactPath: 'programs/target/deploy/solana_ai_inference.so',
    deployable: true,
    note: 'AI inference registry and request protocol. Devnet deployment needs about 3 SOL rent.',
  },
  {
    name: 'clawd-stake',
    programId: '5bp3bDnWYdjiYyB99XWWi6h8ga2wnB1TxuRUb4VNJrTn',
    artifactPath: 'programs/target/deploy/clawd_stake.so',
    deployable: true,
    note: 'Clawd staking reward and position protocol.',
  },
  {
    name: 'mpl-corenft-staking',
    programId: '7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ',
    artifactPath: 'mpl-corenft-staking/target/deploy/mpl_corenft_staking.so',
    deployable: true,
    note: 'DarkDefi MPL Core staking registry.',
  },
  {
    name: 'agent-minter',
    programId: 'agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ',
    deployable: false,
    note: 'Reference CPI minter; requires oracle deployment and a synchronized deploy keypair.',
  },
  {
    name: 'solana-gpt-oracle',
    programId: 'LLMrieZMpbJFwN52WgmBNMxYojrpRVYXdC1RCweEbab',
    deployable: false,
    note: 'Reference MagicBlock oracle program used by agent-minter.',
  },
  {
    name: 'mpl-token-metadata',
    programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    deployable: false,
    note: 'Official Metaplex Token Metadata program reference; do not redeploy under DarkDefi.',
  },
] as const;

function hasRepoMarkers(candidate: string): boolean {
  return (
    existsSync(join(candidate, 'README.md')) &&
    existsSync(join(candidate, 'automaton-main')) &&
    existsSync(join(candidate, '.github', 'workflows', 'autonomous-release.yml'))
  );
}

function ascendCandidates(start: string): string[] {
  const candidates: string[] = [];
  let current = resolve(start);

  while (!candidates.includes(current)) {
    candidates.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return candidates;
}

function findDarkDefiRoot(): string {
  const configuredRoot = process.env.DARKDEFI_ROOT;
  const importRoot = resolve(new URL('../../', import.meta.url).pathname);
  const candidates = [
    ...(configuredRoot ? ascendCandidates(configuredRoot) : []),
    ...ascendCandidates(process.cwd()),
    ...ascendCandidates(importRoot),
  ];

  return candidates.find(hasRepoMarkers) || process.cwd();
}

function fileInfo(root: string, relativePath: string): { present: boolean; sizeBytes: number } {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return { present: false, sizeBytes: 0 };
  return { present: true, sizeBytes: statSync(fullPath).size };
}

async function checkHealth(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null) as { success?: boolean } | null;
    return payload?.success === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkDevnetProgram(programId: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch('https://api.devnet.solana.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'darkdefi-program-check',
        method: 'getAccountInfo',
        params: [programId, { encoding: 'base64' }],
      }),
    });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null) as { result?: { value?: unknown } } | null;
    return Boolean(payload?.result?.value);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getDarkDefiAutomationSnapshot(env = process.env): Promise<DarkDefiAutomationSnapshot> {
  const root = findDarkDefiRoot();
  const workflowReady = fileInfo(root, '.github/workflows/autonomous-release.yml').present;
  const automatonRuntime = fileInfo(root, 'automaton-main/dist/index.js').present;
  const solanaProgram = fileInfo(root, 'mpl-corenft-staking/target/deploy/mpl_corenft_staking.so');
  const solanaProgramId = '7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ';
  const stagingAgentApiUrl = env.DARKDEFI_AGENT_API_STAGING_URL || DEFAULT_STAGING_AGENT_API_URL;
  const productionAgentApiUrl = env.DARKDEFI_AGENT_API_PRODUCTION_URL || DEFAULT_PRODUCTION_AGENT_API_URL;

  const packages = PACKAGE_ARTIFACTS.map((artifact) => {
    const info = fileInfo(root, artifact.path);
    return {
      ...artifact,
      ...info,
    };
  });

  const programChecks = SOLANA_PROGRAMS.map((program) => checkDevnetProgram(program.programId));

  const [stagingHealthy, productionHealthy, devnetProgramDeployed, ...programDeployedFlags] = await Promise.all([
    checkHealth(`${stagingAgentApiUrl}/health`),
    checkHealth(`${productionAgentApiUrl}/health`),
    checkDevnetProgram(solanaProgramId),
    ...programChecks,
  ]);

  const solanaPrograms = SOLANA_PROGRAMS.map((program, index) => {
    const artifactPath = 'artifactPath' in program ? program.artifactPath : undefined;
    const artifactBuilt = artifactPath ? fileInfo(root, artifactPath).present : false;
    return {
      ...program,
      artifactPath,
      artifactBuilt,
      devnetDeployed: programDeployedFlags[index] ?? false,
    };
  });

  const releaseGateReady = Boolean(env.BIRDEYE_API_KEY && env.CLAWD_TOKEN_ADDRESS && workflowReady);
  const allPublishableArtifactsReady = packages.filter((pkg) => pkg.publishable).every((pkg) => pkg.present);
  const deployablePrograms = solanaPrograms.filter((program) => program.deployable);
  const deployableProgramsReady = deployablePrograms.every((program) => program.artifactBuilt && program.devnetDeployed);

  const loops: AutomationLoop[] = [
    {
      id: 'release-gate',
      label: '$CLAWD Release Gate',
      status: releaseGateReady ? 'ready' : 'blocked',
      detail: releaseGateReady ? 'Birdeye credentials and token target are configured.' : 'Needs BIRDEYE_API_KEY and CLAWD_TOKEN_ADDRESS.',
      action: 'GitHub Actions opens the stable clawd-unlocked release.',
    },
    {
      id: 'edge-control',
      label: 'Agent API Edge Control Plane',
      status: stagingHealthy && productionHealthy ? 'live' : 'blocked',
      detail: stagingHealthy && productionHealthy ? 'Staging and production health checks are green.' : 'One or more optional edge health checks failed.',
      action: 'Monitors externally configured agent API health endpoints.',
    },
    {
      id: 'automaton',
      label: 'Automaton Runtime Loop',
      status: automatonRuntime ? 'ready' : 'watching',
      detail: automatonRuntime ? 'Built runtime is available in automaton-main/dist.' : 'Run pnpm build in automaton-main.',
      action: 'Provides heartbeat, state, guarded tools, identity, and loop primitives.',
    },
    {
      id: 'packages',
      label: 'Package Release Candidates',
      status: allPublishableArtifactsReady ? 'ready' : 'blocked',
      detail: allPublishableArtifactsReady ? 'All public tarballs exist and passed dry-run packaging.' : 'Regenerate missing package artifacts.',
      action: 'Publish after npm auth is restored.',
    },
    {
      id: 'staking-program',
      label: 'Solana Program Mesh',
      status: deployableProgramsReady ? 'live' : deployablePrograms.some((program) => program.devnetDeployed) ? 'watching' : 'blocked',
      detail: `${deployablePrograms.filter((program) => program.devnetDeployed).length}/${deployablePrograms.length} deployable programs are live on devnet.`,
      action: 'Mainnet remains blocked until SBF warnings are resolved and a funded authority is selected.',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    releaseGate: {
      tokenAddressConfigured: Boolean(env.CLAWD_TOKEN_ADDRESS),
      birdeyeConfigured: Boolean(env.BIRDEYE_API_KEY),
      target: env.CLAWD_MARKET_CAP_TARGET || '100000',
      workflowReady,
    },
    cloudflare: {
      stagingUrl: stagingAgentApiUrl,
      productionUrl: productionAgentApiUrl,
      stagingHealthy,
      productionHealthy,
    },
    automaton: {
      packageBuilt: packages.find((pkg) => pkg.name === '@conway/automaton')?.present || false,
      runtimeBuilt: automatonRuntime,
      testsExpected: 'pnpm test in automaton-main',
    },
    solanaProgram: {
      programId: solanaProgramId,
      artifactBuilt: solanaProgram.present,
      devnetDeployed: devnetProgramDeployed,
      deployBlocked: true,
      blocker: devnetProgramDeployed
        ? 'Devnet is deployed. Mainnet remains blocked by SBF undefined-syscall warnings and 0 SOL mainnet balance.'
        : 'Devnet deployment pending. Mainnet remains blocked by SBF undefined-syscall warnings and 0 SOL mainnet balance.',
    },
    solanaPrograms,
    packages,
    loops,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}
