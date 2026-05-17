/**
 * `clawd extensions` — bridges the framework CLI into the OpenClawd plugin
 * registry that lives under [`src/plugins`](../../../../../src/plugins/).
 *
 * Loads every extension under [`extensions/`](../../../../../extensions/),
 * prints a per-plugin summary (tools / channels / providers), and returns
 * non-zero only if a plugin throws while registering.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export interface ListExtensionsOptions {
  extensionsDir?: string;
  repoRoot?: string;
}

export async function listExtensionsCommand(opts: ListExtensionsOptions = {}): Promise<void> {
  const repoRoot = opts.repoRoot ?? findRepoRoot(HERE);
  const extensionsDir = opts.extensionsDir ?? resolve(repoRoot, "extensions");

  const { getRuntime, getPluginRegistry } = await loadCoreRuntime(repoRoot);

  const runtime = getRuntime();
  const registry = getPluginRegistry();
  const report = await registry.loadAll({ runtime, extensionsDir });

  console.log(
    `🦞 OpenClawd extensions: ${report.loaded.length} loaded, ` +
      `${report.skipped.length} skipped, ${report.failed.length} failed`,
  );
  for (const p of report.loaded) {
    console.log(
      `  ✓ ${p.id.padEnd(28)} tools=${p.tools.length} channels=${p.channels.length} providers=${p.providers.length}`,
    );
  }
  for (const s of report.skipped) {
    console.log(`  · ${s.id.padEnd(28)} skipped — ${s.reason}`);
  }
  for (const f of report.failed) {
    const first = f.error.split("\n")[0];
    console.log(`  ✗ ${f.id.padEnd(28)} ${first}`);
  }

  if (report.failed.length > 0) {
    process.exitCode = 1;
  }
}

interface CoreRuntime {
  getRuntime: () => unknown;
  getPluginRegistry: () => {
    loadAll: (args: {
      runtime: unknown;
      extensionsDir: string;
    }) => Promise<{
      loaded: Array<{
        id: string;
        tools: unknown[];
        channels: unknown[];
        providers: unknown[];
      }>;
      skipped: Array<{ id: string; reason: string }>;
      failed: Array<{ id: string; error: string }>;
    }>;
  };
}

async function loadCoreRuntime(repoRoot: string): Promise<CoreRuntime> {
  const candidates = [
    resolve(repoRoot, "src/index.ts"),
    resolve(repoRoot, "src/index.js"),
    resolve(repoRoot, "dist/index.js"),
  ];
  for (const c of candidates) {
    if (!existsSync(c)) continue;
    const url = pathToFileURL(c).href;
    const mod = (await import(url)) as Partial<CoreRuntime>;
    if (typeof mod.getRuntime === "function" && typeof mod.getPluginRegistry === "function") {
      return mod as CoreRuntime;
    }
  }
  throw new Error(
    `Unable to locate OpenClawd core runtime under ${repoRoot}. Expected getRuntime + getPluginRegistry exports.`,
  );
}

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "extensions")) && existsSync(resolve(dir, "src"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(start, "..", "..", "..", "..", "..");
}
