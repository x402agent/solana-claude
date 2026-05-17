import fs from "fs";

export interface EnvironmentInfo {
  type: string;
  sandboxId: string;
}

export function detectEnvironment(): EnvironmentInfo {
  // 1. Check env var
  if (process.env.CLAWD_SANDBOX_ID) {
    return { type: "runtime-sandbox", sandboxId: process.env.CLAWD_SANDBOX_ID };
  }

  // 2. Check sandbox config file
  try {
    if (fs.existsSync("/etc/runtime/sandbox.json")) {
      const data = JSON.parse(fs.readFileSync("/etc/runtime/sandbox.json", "utf-8"));
      if (data.id) {
        return { type: "runtime-sandbox", sandboxId: data.id };
      }
    }
  } catch {}

  // 3. Check Docker
  if (fs.existsSync("/.dockerenv")) {
    return { type: "docker", sandboxId: "" };
  }

  // 4. Fall back to platform
  return { type: process.platform, sandboxId: "" };
}
