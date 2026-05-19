import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

type RunnerOptions = {
  preferPythonAgent?: boolean;
  requirePythonAgent?: boolean;
};

function packageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function repoRootCandidates(): string[] {
  const root = packageRoot();
  return [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(root, "..", ".."),
    resolve(root, "..", "..", ".."),
  ];
}

function findPythonAgent(): string | null {
  const explicit = process.env.CLAWD_PERPS_AGENT_PATH;
  if (explicit && existsSync(explicit)) return explicit;

  for (const base of repoRootCandidates()) {
    const candidate = resolve(base, "solana-python-agent", "perps_agent.py");
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function pythonBin(): string {
  return process.env.PYTHON ?? process.env.PYTHON_BIN ?? "python3";
}

function vulcanBin(): string {
  return process.env.VULCAN_BIN ?? "vulcan";
}

function run(bin: string, args: string[]): number {
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`error: failed to run ${bin}: ${result.error.message}`);
    return 127;
  }
  return typeof result.status === "number" ? result.status : 1;
}

export function runPerpsAgent(args: string[], options: RunnerOptions = {}): never {
  const agent = findPythonAgent();
  if (agent && options.preferPythonAgent !== false) {
    process.exit(run(pythonBin(), [agent, ...args]));
  }

  if (options.requirePythonAgent) {
    console.error(
      [
        "error: Python Phoenix perps agent not found.",
        "Set CLAWD_PERPS_AGENT_PATH=/path/to/solana-python-agent/perps_agent.py,",
        "or run from the solana-clawd repository checkout.",
      ].join(" "),
    );
    process.exit(2);
  }

  process.exit(run(vulcanBin(), args));
}

export function runVulcan(args: string[]): never {
  process.exit(run(vulcanBin(), args));
}
