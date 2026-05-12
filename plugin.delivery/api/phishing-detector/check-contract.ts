export const config = { runtime: 'edge' };

const KNOWN_GOOD_PROGRAMS = new Map([
  // Solana system
  ['11111111111111111111111111111111', 'Solana: System Program'],
  ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'Solana: SPL Token Program'],
  ['TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', 'Solana: Token-2022 Program'],
  ['ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', 'Solana: ATA Program'],
  ['ComputeBudget111111111111111111111111111111', 'Solana: Compute Budget'],
  ['metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', 'Metaplex: Token Metadata'],
  // PumpFun
  ['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', 'PumpFun: Pump Program'],
  ['pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA', 'PumpFun: PumpAMM Program'],
  ['pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ', 'PumpFun: PumpFees Program'],
  // Jupiter
  ['JUP6LkMUje1knDPNBwLoXkTQYDKCLEacpZZHK3YVcVoM', 'Jupiter: v6 Aggregator'],
  ['JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', 'Jupiter: v4 Aggregator'],
  // Raydium
  ['675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', 'Raydium: AMM v4'],
  ['CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', 'Raydium: CLMM'],
  // Orca
  ['whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', 'Orca: Whirlpools'],
  // Marinade
  ['MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD', 'Marinade Finance'],
]);

const KNOWN_MALICIOUS: Map<string, string> = new Map([
  // Well-known Tornado Cash contracts (OFAC sanctioned)
  ['0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', 'Tornado Cash: Router'],
  ['0x722122df12d4e14e13ac3b6895a86e84145b6967', 'Tornado Cash: 0.1 ETH'],
  ['0xdd4c48c0b24039969fc16d1cdf626eab821d3384', 'Tornado Cash: 1 ETH'],
  ['0xd96f2b1ef156b3eb16ce10defea05cbe96b6e0e0', 'Tornado Cash: 10 ETH'],
  ['0xa160cdab225685da1d56aa342ad8841c3b53f291', 'Tornado Cash: 100 ETH'],
]);

function isEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function isBase58Address(addr: string): boolean {
  const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return addr.length >= 32 && addr.length <= 44 && [...addr].every(c => base58.includes(c));
}

function detectChain(address: string): string {
  if (isEthAddress(address)) return 'ethereum';
  if (isBase58Address(address)) return 'solana';
  return 'unknown';
}

function checkAddressMimicry(address: string, knownPrograms: Map<string, string>): string | null {
  // Check if the address's first and last 4 chars match a known program but the middle differs
  for (const [known, label] of knownPrograms) {
    if (address === known) continue;
    const addrLower = address.toLowerCase();
    const knownLower = known.toLowerCase();
    if (
      addrLower.substring(0, 4) === knownLower.substring(0, 4) &&
      addrLower.substring(addrLower.length - 4) === knownLower.substring(knownLower.length - 4) &&
      addrLower !== knownLower
    ) {
      return label;
    }
  }
  return null;
}

/**
 * Check if contract is flagged as malicious
 */
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing required field: address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chain = detectChain(address);

    if (chain === 'unknown') {
      return new Response(JSON.stringify({ error: 'Invalid address format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checks = {
      blocklist: false,
      addressMimicry: false,
      knownProgram: false,
    };

    // Check known good programs
    const knownLabel = KNOWN_GOOD_PROGRAMS.get(address);
    if (knownLabel) {
      checks.knownProgram = true;
      return new Response(JSON.stringify({
        success: true,
        data: {
          address,
          chain,
          isMalicious: false,
          confidence: 'high',
          label: knownLabel,
          verified: true,
          checks,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check known malicious
    const maliciousLabel = KNOWN_MALICIOUS.get(address.toLowerCase());
    if (maliciousLabel) {
      checks.blocklist = true;
      return new Response(JSON.stringify({
        success: true,
        data: {
          address,
          chain,
          isMalicious: true,
          confidence: 'high',
          label: maliciousLabel,
          verified: false,
          checks,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check address mimicry
    const mimics = checkAddressMimicry(address, KNOWN_GOOD_PROGRAMS);
    if (mimics) {
      checks.addressMimicry = true;
      return new Response(JSON.stringify({
        success: true,
        data: {
          address,
          chain,
          isMalicious: false,
          confidence: 'low',
          label: null,
          verified: false,
          checks,
          warning: `Address resembles known program: ${mimics}. Verify carefully.`,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        address,
        chain,
        isMalicious: false,
        confidence: 'medium',
        label: null,
        verified: false,
        checks,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

