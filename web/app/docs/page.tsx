import fs from "fs";
import path from "path";
import { DocsClient } from "./DocsClient";

const DOCS = [
  { slug: "architecture", label: "Runtime Map", file: "architecture.md" },
  { slug: "trade", label: "Trading Skill", file: "docs/TRADE.md" },
  { slug: "risk-engine", label: "Risk Engine Spec", file: "docs/risk-engine-spec.md" },
  { slug: "migration", label: "Migration Guide", file: "docs/migrate-from-openclaw.md" },
  { slug: "soul", label: "SOUL.md", file: "SOUL.md" },
  { slug: "contributing", label: "Contributing", file: "CONTRIBUTING.md" },
] as const;

export const metadata = {
  title: "Docs — $CLAWD",
  description: "Runtime map, trading skill, risk engine, migration guide, identity, and contribution guide for the $CLAWD Solana agent stack.",
};

export default function DocsPage() {
  const root = path.resolve(process.cwd(), "..");

  const docs = DOCS.map((d) => {
    const fp = path.join(root, d.file);
    const content = fs.existsSync(fp) ? fs.readFileSync(fp, "utf-8") : `*File not found: ${d.file}*`;
    return { ...d, content };
  });

  return <DocsClient docs={docs} />;
}
