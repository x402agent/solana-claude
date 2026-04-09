import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourcePath = path.join(repoRoot, "skills", "solana-clawd", "SKILL.md");
const targetDir = path.join(repoRoot, "skill", "solana-clawd");
const targetPath = path.join(targetDir, "SKILL.md");
const readmePath = path.join(repoRoot, "skill", "README.md");

if (!fs.existsSync(sourcePath)) {
  throw new Error("Missing canonical skill at skills/solana-clawd/SKILL.md");
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);

const readme = `# Solana-Clawd Standalone Skill

This directory exposes the master \`solana-clawd\` skill as a standalone install target for the \`skills\` CLI.

Install just the master skill from GitHub:

\`\`\`bash
npx skills add x402agent/solana-clawd --path skill/solana-clawd
\`\`\`

Use this instead of installing from the repo root when you want only the Solana-clawd master skill and not the full bundled skill catalog.
`;

fs.mkdirSync(path.dirname(readmePath), { recursive: true });
fs.writeFileSync(readmePath, readme);

console.log("Synced standalone skill bundle:");
console.log(" - skill/solana-clawd/SKILL.md");
console.log(" - skill/README.md");
