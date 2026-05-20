export type PerpProgramOiReadArgs<T> = {
  rpcUrl: string;
  marketAccount: string;
  decodeMarket: (data: Buffer) => T;
  pickLongOi: (decoded: T) => bigint | number;
  pickShortOi: (decoded: T) => bigint | number;
};

export type PerpProgramOiSnapshot = {
  marketAccount: string;
  longOi: number;
  shortOi: number;
  totalOi: number;
  balanced: boolean;
  slot?: number;
};

type RpcAccountInfoResponse = {
  result?: {
    context?: { slot?: number };
    value?: {
      data?: [string, string] | string;
    } | null;
  };
  error?: { message?: string };
};

function decodeBase64Account(data: [string, string] | string | undefined): Buffer {
  if (!data) throw new Error("Market account returned no data.");
  if (Array.isArray(data)) {
    if (data[1] !== "base64") {
      throw new Error(`Unsupported account encoding: ${data[1]}`);
    }
    return Buffer.from(data[0], "base64");
  }
  return Buffer.from(data, "base64");
}

export async function readPerpProgramOi<T>(
  args: PerpProgramOiReadArgs<T>,
): Promise<PerpProgramOiSnapshot> {
  if (!args.rpcUrl.trim()) {
    throw new Error("rpcUrl must be a non-empty string.");
  }
  if (!args.marketAccount.trim()) {
    throw new Error("marketAccount must be a non-empty string.");
  }

  const response = await fetch(args.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "clawd-perps-oi",
      method: "getAccountInfo",
      params: [
        args.marketAccount,
        {
          commitment: "confirmed",
          encoding: "base64",
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC getAccountInfo failed with HTTP ${response.status}.`);
  }

  const json = (await response.json()) as RpcAccountInfoResponse;
  if (json.error) {
    throw new Error(json.error.message ?? "RPC getAccountInfo failed.");
  }
  if (!json.result?.value) {
    throw new Error("Market account not found.");
  }

  const decoded = args.decodeMarket(decodeBase64Account(json.result.value.data));
  const longOi = Number(args.pickLongOi(decoded));
  const shortOi = Number(args.pickShortOi(decoded));

  if (!Number.isFinite(longOi) || !Number.isFinite(shortOi)) {
    throw new Error("Decoded market OI values must be finite numbers.");
  }

  const totalOi = longOi + shortOi;
  return {
    marketAccount: args.marketAccount,
    longOi,
    shortOi,
    totalOi,
    balanced: Math.abs(longOi - shortOi) <= Math.max(1, totalOi * 0.001),
    slot: json.result.context?.slot,
  };
}
