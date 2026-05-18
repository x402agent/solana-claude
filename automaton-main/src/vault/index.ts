import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";

export type Tier = "KNOWN" | "LEARNED" | "INFERRED";

export interface Entry {
  tier: Tier;
  key: string;
  value: unknown;
  ts: number;
  provenance?: string;
}

export interface ClawdVaultOpts {
  workspace: string;
  vaultDir?: string;
}

export interface VaultSnapshot {
  owner: string;
  tiers: Record<Tier, Entry[]>;
  workspace_manifest: string[];
}

const TIER_FILES: Record<Tier, string> = {
  KNOWN: "known.jsonl",
  LEARNED: "learned.jsonl",
  INFERRED: "inferred.jsonl",
};

export class ClawdVault {
  #opts: Required<ClawdVaultOpts>;
  #buffer = new Map<string, Entry[]>();
  #flushTimer: NodeJS.Timeout;

  constructor(opts: ClawdVaultOpts) {
    this.#opts = {
      workspace: opts.workspace,
      vaultDir: opts.vaultDir ?? process.env.CLAWD_VAULT_DIR ?? "/vault",
    };

    void fs.mkdir(this.#opts.vaultDir, { recursive: true }).catch(() => undefined);
    this.#flushTimer = setInterval(() => {
      void this.flushAll().catch(() => undefined);
    }, 30_000);
    this.#flushTimer.unref?.();
  }

  writeKnown(owner: string, entry: Omit<Entry, "tier" | "ts">) {
    this.#push(owner, { ...entry, tier: "KNOWN", ts: Date.now() });
  }

  writeLearned(owner: string, entry: Omit<Entry, "tier" | "ts">) {
    this.#push(owner, { ...entry, tier: "LEARNED", ts: Date.now() });
  }

  writeInferred(owner: string, data: object) {
    this.#push(owner, {
      tier: "INFERRED",
      key: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      value: data,
      ts: Date.now(),
    });
  }

  async read(owner: string, tier: Tier): Promise<Entry[]> {
    const local = this.#buffer.get(`${owner}:${tier}`) ?? [];
    const onDisk = await this.#readFromDisk(owner, tier);
    return [...onDisk, ...local];
  }

  async flushAll() {
    for (const [key, entries] of this.#buffer.entries()) {
      const [, tier] = key.split(":") as [string, Tier];
      if (tier === "INFERRED") {
        const cutoff = Date.now() - 5 * 60_000;
        this.#buffer.set(key, entries.filter((entry) => entry.ts > cutoff));
        continue;
      }
      this.#buffer.set(key, []);
    }
  }

  async snapshot(owner: string): Promise<VaultSnapshot> {
    await this.flushAll();
    const [known, learned, inferred, workspace_manifest] = await Promise.all([
      this.read(owner, "KNOWN"),
      this.read(owner, "LEARNED"),
      this.read(owner, "INFERRED"),
      this.#workspaceManifest(owner),
    ]);

    return {
      owner,
      tiers: { KNOWN: known, LEARNED: learned, INFERRED: inferred },
      workspace_manifest,
    };
  }

  async rehydrateFromSnapshot(snapshot: Omit<VaultSnapshot, "workspace_manifest">): Promise<void> {
    for (const tier of ["KNOWN", "LEARNED", "INFERRED"] as Tier[]) {
      const file = path.join(this.#opts.vaultDir, TIER_FILES[tier]);
      const stream = createWriteStream(file, { flags: "w" });
      for (const entry of snapshot.tiers[tier] ?? []) {
        stream.write(`${JSON.stringify({ owner: snapshot.owner, ...entry })}\n`);
      }
      await new Promise<void>((resolve, reject) =>
        stream.end((err?: Error | null) => (err ? reject(err) : resolve())),
      );
    }
  }

  async brainAsk(owner: string, query: string): Promise<string | null> {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    const [known, learned] = await Promise.all([this.read(owner, "KNOWN"), this.read(owner, "LEARNED")]);
    const haystack = [...learned, ...known];
    const matches = haystack.filter((entry) =>
      `${entry.key} ${renderValue(entry.value)} ${entry.provenance ?? ""}`.toLowerCase().includes(needle),
    );
    if (matches.length === 0) return null;
    return matches
      .slice(-5)
      .map((entry) => `[${entry.tier}] ${entry.key}: ${renderValue(entry.value)}`)
      .join("\n");
  }

  #push(owner: string, entry: Entry) {
    const key = `${owner}:${entry.tier}`;
    const entries = this.#buffer.get(key) ?? [];
    entries.push(entry);
    this.#buffer.set(key, entries);
    void this.#appendToDisk(owner, entry).catch(() => undefined);
  }

  async #appendToDisk(owner: string, entry: Entry): Promise<void> {
    const file = path.join(this.#opts.vaultDir, TIER_FILES[entry.tier]);
    await fs.appendFile(file, `${JSON.stringify({ owner, ...entry })}\n`, "utf8");
  }

  async #readFromDisk(owner: string, tier: Tier): Promise<Entry[]> {
    const file = path.join(this.#opts.vaultDir, TIER_FILES[tier]);
    try {
      const text = await fs.readFile(file, "utf8");
      return text
        .split("\n")
        .filter(Boolean)
        .flatMap((line) => {
          try {
            const parsed = JSON.parse(line) as Entry & { owner?: string };
            if (parsed.owner && parsed.owner !== owner) return [];
            return [
              {
                tier,
                key: parsed.key,
                value: parsed.value,
                ts: parsed.ts,
                provenance: parsed.provenance,
              },
            ];
          } catch {
            return [];
          }
        });
    } catch {
      return [];
    }
  }

  async #workspaceManifest(owner: string): Promise<string[]> {
    const dir = path.join(this.#opts.workspace, owner);
    const files: string[] = [];

    const walk = async (current: string) => {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    };

    try {
      await walk(dir);
      return files.sort();
    } catch {
      return [];
    }
  }
}

function renderValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
