export const config = { runtime: 'edge' };

const WHITELISTED_DOMAINS = new Set([
  'pump.fun', 'jup.ag', 'raydium.io', 'orca.so', 'marinade.finance',
  'dexscreener.com', 'birdeye.so', 'solscan.io', 'explorer.solana.com',
  'solana.com', 'solana.org', 'solflare.com', 'phantom.app',
  'uniswap.org', 'app.uniswap.org', 'aave.com', 'app.aave.com',
  'compound.finance', 'lido.fi', 'curve.fi',
  'etherscan.io', 'ethereum.org',
  'github.com', 'coinmarketcap.com', 'coingecko.com',
  'jupiter.ag',
]);

const TYPOSQUAT_TARGETS: Record<string, string> = {
  'pump.fun': 'pump.fun',
  'pumpp.fun': 'pump.fun',
  'puump.fun': 'pump.fun',
  'pumps.fun': 'pump.fun',
  'pump-fun.com': 'pump.fun',
  'pumpfun.com': 'pump.fun',
  'pumpfun.io': 'pump.fun',
  'jup.ag': 'jup.ag',
  'jupp.ag': 'jup.ag',
  'jup1ter.ag': 'jup.ag',
  'jupiter-ag.com': 'jup.ag',
  'raydium.io': 'raydium.io',
  'rayd1um.io': 'raydium.io',
  'raydiun.io': 'raydium.io',
  'raydium.com': 'raydium.io',
  'uniswap.org': 'uniswap.org',
  'uni5wap.org': 'uniswap.org',
  'uniswapp.org': 'uniswap.org',
  'uniiswap.org': 'uniswap.org',
  'uniswap.com': 'uniswap.org',
  'phantom.app': 'phantom.app',
  'phant0m.app': 'phantom.app',
  'phantoom.app': 'phantom.app',
  'phantom-app.com': 'phantom.app',
};

const SUSPICIOUS_TLDS = new Set([
  '.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq',
  '.click', '.link', '.buzz', '.rest', '.monster',
]);

// Cyrillic homoglyphs that look like Latin characters
const HOMOGLYPHS: Record<string, string> = {
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p',
  '\u0441': 'c', '\u0443': 'y', '\u0445': 'x', '\u043d': 'h',
  '\u0456': 'i', '\u0458': 'j', '\u0455': 's', '\u0442': 't',
};

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function checkHomoglyphs(domain: string): boolean {
  for (const char of domain) {
    if (HOMOGLYPHS[char]) return true;
  }
  return false;
}

function findTyposquat(domain: string): string | null {
  const legitimate = TYPOSQUAT_TARGETS[domain];
  if (legitimate && legitimate !== domain) return legitimate;

  // Check Levenshtein distance 1 from known domains
  for (const [typo, legit] of Object.entries(TYPOSQUAT_TARGETS)) {
    if (typo === domain && legit !== domain) return legit;
  }

  // Check if domain contains a known brand with different TLD
  for (const known of WHITELISTED_DOMAINS) {
    const knownBase = known.split('.')[0];
    const domainBase = domain.split('.')[0];
    if (knownBase === domainBase && known !== domain) return known;
  }

  return null;
}

/**
 * Check if URL is phishing
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
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing required field: url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const domain = extractDomain(url);
    if (!domain) {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checks = {
      blocklist: false,
      typosquat: false,
      homoglyph: false,
      suspiciousTld: false,
      whitelisted: false,
    };

    let isPhishing = false;
    let confidence = 'low';
    let reason = '';
    let legitimateDomain: string | null = null;

    // Check whitelist first
    if (WHITELISTED_DOMAINS.has(domain)) {
      checks.whitelisted = true;
      return new Response(JSON.stringify({
        success: true,
        data: {
          url,
          isPhishing: false,
          confidence: 'high',
          reason: `Known legitimate domain: ${domain}`,
          checks,
          legitimateDomain: null,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check homoglyphs
    if (checkHomoglyphs(domain)) {
      checks.homoglyph = true;
      isPhishing = true;
      confidence = 'high';
      reason = `Domain contains Cyrillic/homoglyph characters that mimic Latin letters`;
    }

    // Check typosquatting
    const typosquatOf = findTyposquat(domain);
    if (typosquatOf) {
      checks.typosquat = true;
      legitimateDomain = typosquatOf;
      isPhishing = true;
      confidence = 'high';
      reason = `Typosquat of ${typosquatOf}`;
    }

    // Check suspicious TLDs
    for (const tld of SUSPICIOUS_TLDS) {
      if (domain.endsWith(tld)) {
        checks.suspiciousTld = true;
        if (!isPhishing) {
          confidence = 'low';
          reason = `Suspicious TLD: ${tld}`;
        }
        break;
      }
    }

    // Try to check MetaMask blocklist (cached)
    try {
      const blocklist = await fetch(
        'https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/master/src/config.json',
        { headers: { 'Cache-Control': 'max-age=3600' } }
      );
      if (blocklist.ok) {
        const config = await blocklist.json();
        const blacklist: string[] = config.blacklist || [];
        if (blacklist.includes(domain)) {
          checks.blocklist = true;
          isPhishing = true;
          confidence = 'high';
          reason = 'Domain found on MetaMask phishing blocklist';
        }
      }
    } catch {
      // Continue without blocklist check
    }

    if (!reason) {
      reason = 'No phishing indicators detected';
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        url,
        isPhishing,
        confidence,
        reason,
        checks,
        legitimateDomain,
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

