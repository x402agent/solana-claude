import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

const OPENROUTER_AUTH_URL = 'https://openrouter.ai/auth';
const OPENROUTER_KEYS_URL = 'https://openrouter.ai/api/v1/auth/keys';
const DEFAULT_WEB_CALLBACK = 'https://solanaclawd.com/callback/auth';

export type OAuthMode = 'web' | 'local';

function getKeyFilePath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg?.trim() ? xdg : join(homedir(), '.config');
  return join(base, 'openclawd', 'openrouter-key');
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

function codeChallenge(verifier: string): string {
  return base64UrlEncode(createHash('sha256').update(verifier).digest());
}

function openBrowser(url: string): void {
  const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';
  try {
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
  } catch {
    // best effort — user can paste URL manually
  }
}

export function readStoredKey(): string | null {
  const path = getKeyFilePath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8').trim();
    return raw || null;
  } catch {
    return null;
  }
}

export function writeStoredKey(key: string): void {
  const path = getKeyFilePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, key, 'utf-8');
  try {
    chmodSync(path, 0o600);
  } catch {
    // non-POSIX platforms
  }
}

export function clearStoredKey(): void {
  const path = getKeyFilePath();
  if (existsSync(path)) writeFileSync(path, '', 'utf-8');
}

async function exchangeCodeForKey(code: string, codeVerifier: string): Promise<string> {
  const res = await fetch(OPENROUTER_KEYS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      code_challenge_method: 'S256',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter key exchange failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { key?: string; user_id?: string };
  if (!data.key) throw new Error('OpenRouter exchange returned no key');
  return data.key;
}

function promptForCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Paste the code shown in the browser: ', (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (!trimmed) {
        reject(new Error('No code entered'));
        return;
      }
      resolve(trimmed);
    });
  });
}

/**
 * Web-callback OAuth flow. Opens OpenRouter's authorize page pointing at
 * https://solanaclawd.com/callback/auth, which shows the `code` for the user
 * to paste into the terminal. The CLI exchanges {code, code_verifier} locally
 * — the verifier never leaves this process.
 */
async function loginWithOAuthWeb(): Promise<string> {
  const verifier = generateCodeVerifier();
  const challenge = codeChallenge(verifier);

  const authUrl = new URL(OPENROUTER_AUTH_URL);
  authUrl.searchParams.set('callback_url', DEFAULT_WEB_CALLBACK);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  process.stderr.write('\n');
  process.stderr.write('Opening OpenRouter sign-in (web callback)…\n');
  process.stderr.write(`If it does not open, paste this URL into a browser:\n  ${authUrl.toString()}\n\n`);
  openBrowser(authUrl.toString());

  const code = await promptForCode();
  return exchangeCodeForKey(code, verifier);
}

/**
 * Local-loopback OAuth flow. Binds a localhost HTTP server on a free port,
 * passes its callback URL to OpenRouter, captures the code automatically.
 * Use this when the web-callback flow isn't available (e.g., solanaclawd.com
 * isn't reachable, or OpenRouter rejects the callback URL).
 */
async function loginWithOAuthLocal(options: { timeoutMs?: number } = {}): Promise<string> {
  const verifier = generateCodeVerifier();
  const challenge = codeChallenge(verifier);
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;

  return new Promise<string>((resolve, reject) => {
    let resolved = false;
    const server = createServer(async (req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/callback') {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const code = url.searchParams.get('code');
      if (!code) {
        res.statusCode = 400;
        res.end('Missing ?code parameter');
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        '<!doctype html><meta charset="utf-8"><title>OpenClawd</title>' +
          '<style>body{font-family:system-ui;background:#0b0b0b;color:#f5f5f5;display:grid;place-items:center;height:100vh;margin:0}</style>' +
          '<main><h1>🦞 Connected</h1><p>You can close this tab and return to the terminal.</p></main>',
      );
      try {
        const key = await exchangeCodeForKey(code, verifier);
        resolved = true;
        server.close();
        resolve(key);
      } catch (err) {
        resolved = true;
        server.close();
        reject(err);
      }
    });

    server.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind OAuth callback port'));
        return;
      }
      const callbackUrl = `http://127.0.0.1:${address.port}/callback`;
      const authUrl = new URL(OPENROUTER_AUTH_URL);
      authUrl.searchParams.set('callback_url', callbackUrl);
      authUrl.searchParams.set('code_challenge', challenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      process.stderr.write('\n');
      process.stderr.write('Opening OpenRouter sign-in (local loopback)…\n');
      process.stderr.write(`If it does not open, paste this URL into a browser:\n  ${authUrl.toString()}\n\n`);
      openBrowser(authUrl.toString());
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        server.close();
        reject(new Error('OAuth login timed out'));
      }
    }, timeoutMs);
  });
}

export function loginWithOAuth(options: { mode?: OAuthMode } = {}): Promise<string> {
  const mode = options.mode ?? 'web';
  return mode === 'local' ? loginWithOAuthLocal() : loginWithOAuthWeb();
}

/**
 * Resolve an OpenRouter API key: env → stored file → OAuth login.
 * Pass `mode: 'local'` to use the localhost-loopback flow instead of web.
 */
export async function resolveApiKey(
  options: { forceLogin?: boolean; mode?: OAuthMode } = {},
): Promise<string> {
  if (!options.forceLogin) {
    const envKey = process.env.OPENROUTER_API_KEY?.trim();
    if (envKey) return envKey;
    const stored = readStoredKey();
    if (stored) return stored;
  }
  const key = await loginWithOAuth({ mode: options.mode });
  writeStoredKey(key);
  return key;
}
