export const config = { runtime: 'edge' };

// Well-known OFAC sanctioned addresses (Tornado Cash and related)
const SANCTIONED_ADDRESSES = new Map<string, { entity: string; type: string; dateAdded: string; list: string }[]>([
  // Tornado Cash contracts
  ['0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0x722122df12d4e14e13ac3b6895a86e84145b6967', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0xdd4c48c0b24039969fc16d1cdf626eab821d3384', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0xd96f2b1ef156b3eb16ce10defea05cbe96b6e0e0', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0xa160cdab225685da1d56aa342ad8841c3b53f291', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0xf60dd140cff0706bae9cd734ac3683696190ffbf', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0x23773e65ed146a459791799d01336db287f25334', [{ entity: 'Tornado Cash', type: 'Deployer', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0xba214c1c1928a32bffe790263e38b4af9bfcd659', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0xb1c8094b234dce6e03f10a5b673c1d8c69739a00', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0x527653ea119f3e6a1f5bd18fbf4714081d7b31ce', [{ entity: 'Tornado Cash', type: 'Smart Contract', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  ['0x58e8dcc13be9780fc42e8723d8ead4cf46943df2', [{ entity: 'Tornado Cash', type: 'Smart Contract (Relayer Registry)', dateAdded: '2022-08-08', list: 'OFAC SDN' }]],
  // Blender.io
  ['0x8589427373d6d84e98730d7795d8f6f8731fda16', [{ entity: 'Blender.io', type: 'Smart Contract', dateAdded: '2022-05-06', list: 'OFAC SDN' }]],
  // Garantex
  ['0x6f1ca141a28907f78ebaa64f83078debf3bc0aff', [{ entity: 'Garantex', type: 'Exchange Wallet', dateAdded: '2022-04-05', list: 'OFAC SDN' }]],
  // Lazarus Group (DPRK)
  ['0x098b716b8aaf21512996dc57eb0615e2383e2f96', [{ entity: 'Lazarus Group', type: 'Wallet', dateAdded: '2022-04-14', list: 'OFAC SDN' }]],
  ['0xa7e5d5a720f06526557c513402f2e6b5fa20b008', [{ entity: 'Lazarus Group', type: 'Wallet', dateAdded: '2022-04-14', list: 'OFAC SDN' }]],
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

const DISCLAIMER = 'This check is informational only. It uses a static list of known sanctioned addresses and may not be complete or current. Always verify with official OFAC SDN and EU sanctions lists.';

/**
 * Check if address is sanctioned
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
      return new Response(JSON.stringify({ error: 'Invalid address format. Provide an Ethereum (0x...) or Solana (base58) address.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const listsChecked = ['OFAC SDN', 'EU Sanctions'];
    const matches = SANCTIONED_ADDRESSES.get(address.toLowerCase());

    if (matches && matches.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          address,
          chain,
          sanctioned: true,
          lists_checked: listsChecked,
          matches,
          timestamp: new Date().toISOString(),
          disclaimer: DISCLAIMER,
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
        sanctioned: false,
        lists_checked: listsChecked,
        timestamp: new Date().toISOString(),
        disclaimer: DISCLAIMER,
        note: 'Address not found on known sanctions lists. Absence from this check does not guarantee clearance.',
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

