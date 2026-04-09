import fs from "fs";
import path from "path";
import { MigrateClient } from "./MigrateClient";

export const metadata = {
  title: "Migrate from OpenClaw — $CLAWD",
  description:
    "Migrate from OpenClaw to solana-clawd — config mappings, memory tier conversion, wallet migration, model mapping, and troubleshooting.",
};

export default function MigratePage() {
  const root = path.resolve(process.cwd(), "..");
  const fp = path.join(root, "docs/migrate-from-openclaw.md");
  const content = fs.existsSync(fp)
    ? fs.readFileSync(fp, "utf-8")
    : "*migrate-from-openclaw.md not found*";

  return <MigrateClient content={content} />;
}
