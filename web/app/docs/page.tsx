import fs from "fs";
import path from "path";
import { DocsClient } from "./DocsClient";

const DOCS = [
  { slug: "architecture", label: "Runtime Map", file: "architecture.md" },
  { slug: "risk-engine", label: "Risk Engine Spec", file: "docs/risk-engine-spec.md" },
  { slug: "migration", label: "Migration Guide", file: "docs/migrate-from-openclaw.md" },
] as const;

export const metadata = {
  title: "Docs — $CLAWD",
  description: "Runtime map, risk engine specification, and migration guide for the $CLAWD Solana blockchain and finance agent stack.",
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
