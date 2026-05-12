// Wires the OpenClawd secret-scanning git hooks into the user's checkout.
// Called from the spawn wizard so every freshly-hatched leviathan has the
// commit/push-time guard active before it ever touches a wallet.

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface GuardResult {
  installed: boolean;
  reason?: string;
}

function findRepoRoot(start: string): string | null {
  try {
    const out = execSync("git rev-parse --show-toplevel", {
      cwd: start,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function findInstallerScript(repoRoot: string): string | null {
  const candidates = [
    path.join(repoRoot, "scripts", "install-hooks.sh"),
    path.join(repoRoot, "..", "scripts", "install-hooks.sh"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function installSecretGuard(cwd: string = process.cwd()): GuardResult {
  const repoRoot = findRepoRoot(cwd);
  if (!repoRoot) {
    return { installed: false, reason: "not-a-git-repo" };
  }

  const installer = findInstallerScript(repoRoot);
  if (!installer) {
    return { installed: false, reason: "installer-missing" };
  }

  const result = spawnSync("bash", [installer], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    return { installed: false, reason: `installer-exit-${result.status}` };
  }
  return { installed: true };
}
