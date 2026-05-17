import { z } from "zod";
import { PrefixSchema, SuffixSchema } from "../../utils/validation.js";
import type { ServerState, ToolResult } from "../../types.js";

const EstimateSchema = z.object({
  prefix: PrefixSchema.optional(),
  suffix: SuffixSchema.optional(),
  caseInsensitive: z.boolean().default(false),
});

const BASE58_SIZE = 58;
const CASE_INSENSITIVE_SIZE = 34;

export async function estimateVanityTime(
  args: Record<string, unknown>,
  _state: ServerState,
): Promise<ToolResult> {
  const parsed = EstimateSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { prefix, suffix, caseInsensitive } = parsed.data;

  if (!prefix && !suffix) {
    return {
      content: [{ type: "text", text: "Specify at least one of prefix or suffix" }],
      isError: true,
    };
  }

  const alphabetSize = caseInsensitive ? CASE_INSENSITIVE_SIZE : BASE58_SIZE;
  const prefixLen = prefix?.length ?? 0;
  const suffixLen = suffix?.length ?? 0;

  const prefixP = prefixLen > 0 ? Math.pow(alphabetSize, prefixLen) : 1;
  const suffixP = suffixLen > 0 ? Math.pow(alphabetSize, suffixLen) : 1;
  const totalAttempts = prefixP * suffixP;

  const jsRate = 15_000;
  const rustRate = 100_000;
  const jsSeconds = totalAttempts / jsRate;
  const rustSeconds = totalAttempts / rustRate;

  const formatTime = (s: number): string => {
    if (s < 60) return `${s.toFixed(1)} seconds`;
    if (s < 3600) return `${(s / 60).toFixed(1)} minutes`;
    if (s < 86400) return `${(s / 3600).toFixed(1)} hours`;
    if (s < 31536000) return `${(s / 86400).toFixed(1)} days`;
    return `${(s / 31536000).toFixed(1)} years`;
  };

  const patternDesc = [
    prefix ? `prefix "${prefix}" (${prefixLen} chars)` : null,
    suffix ? `suffix "${suffix}" (${suffixLen} chars)` : null,
  ]
    .filter(Boolean)
    .join(" + ");

  const table = `
| Length | Case-Sensitive | Case-Insensitive |
|--------|----------------|------------------|
| 1 char | ~58 attempts | ~34 attempts |
| 2 char | ~3,364 attempts | ~1,156 attempts |
| 3 char | ~195,112 attempts | ~39,304 attempts |
| 4 char | ~11.3M attempts | ~1.3M attempts |
| 5 char | ~656M attempts | ~45M attempts |
| 6 char | ~38B attempts | ~1.5B attempts |`;

  return {
    content: [
      {
        type: "text",
        text: [
          "📊 Vanity Address Estimation",
          "",
          `Pattern: ${patternDesc}`,
          `Case-insensitive: ${caseInsensitive}`,
          "",
          `**Expected attempts:** ${totalAttempts.toLocaleString()}`,
          `**TypeScript (MCP):** ${formatTime(jsSeconds)} (at ~${jsRate.toLocaleString()} keys/sec)`,
          `**Rust generator:** ${formatTime(rustSeconds)} (at ~${rustRate.toLocaleString()} keys/sec)`,
          table,
          "",
          "💡 Tips:",
          "- Each additional character makes it ~58x harder",
          "- Case-insensitive matching is ~1.7x faster per character",
          "- The Rust vanity generator (`rust/`) is ~7x faster than this MCP tool",
          "- For 4+ character patterns, use the Rust generator",
        ].join("\n"),
      },
    ],
  };
}
