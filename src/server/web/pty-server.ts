import express from "express";
import { createServer } from "http";
import { mkdirSync } from "fs";
import path from "path";
import { spawn } from "node-pty";
import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import { ConnectionRateLimiter } from "./auth.js";
import { SessionManager } from "./session-manager.js";
import { UserStore } from "./user-store.js";
import { createAdminRouter } from "./admin.js";
import { SessionStore } from "./auth/adapter.js";
import { TokenAuthAdapter } from "./auth/token-auth.js";
import { OAuthAdapter } from "./auth/oauth-auth.js";
import { ApiKeyAdapter } from "./auth/apikey-auth.js";
import type { AuthAdapter, AuthUser } from "./auth/adapter.js";

// ── Configuration ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS ?? "10", 10);
const MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER ?? "3", 10);
const MAX_SESSIONS_PER_HOUR = parseInt(process.env.MAX_SESSIONS_PER_HOUR ?? "10", 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") ?? [];
const GRACE_PERIOD_MS = parseInt(process.env.SESSION_GRACE_MS ?? String(5 * 60_000), 10);
const SCROLLBACK_BYTES = parseInt(process.env.SCROLLBACK_BYTES ?? String(100 * 1024), 10);
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";
const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "token";
const SESSION_SECRET = process.env.SESSION_SECRET ?? crypto.randomUUID();
const USER_HOME_BASE = process.env.USER_HOME_BASE ?? "/home/claude/users";

// ── Auth adapter ──────────────────────────────────────────────────────────────

const sessionStore = new SessionStore(SESSION_SECRET);

let authAdapter: AuthAdapter;
switch (AUTH_PROVIDER) {
  case "oauth":
    authAdapter = new OAuthAdapter(sessionStore);
    break;
  case "apikey":
    authAdapter = new ApiKeyAdapter(sessionStore);
    break;
  default:
    authAdapter = new TokenAuthAdapter();
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const server = createServer(app);

// Register auth routes (login, callback, logout) before static files so they
// take priority over any index.html fallback.
authAdapter.setupRoutes(app);

// ── User store ────────────────────────────────────────────────────────────────

const userStore = new UserStore();

// ── Session Manager ───────────────────────────────────────────────────────────

/** Returns the user-specific home directory, creating it if needed. */
function userHomeDir(userId: string): string {
  const dir = path.join(USER_HOME_BASE, userId);
  try {
    mkdirSync(path.join(dir, ".claude"), { recursive: true });
  } catch {
    // Already exists or no permission — fail silently; PTY spawn will surface any real issue.
  }
  return dir;
}

const sessionManager = new SessionManager(
  MAX_SESSIONS,
  (cols, rows, user?: AuthUser) => {
    const userId = user?.id ?? "default";
    const home = userHomeDir(userId);
    return spawn(CLAUDE_BIN, [], {
      name: "xterm-256color",
      cols,
      rows,
      cwd: process.env.WORK_DIR ?? home,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        HOME: home,
        // Inject the user's own API key when using apikey auth provider.
        ...(user?.apiKey ? { ANTHROPIC_API_KEY: user.apiKey } : {}),
      },
    });
  },
  GRACE_PERIOD_MS,
  SCROLLBACK_BYTES,
  MAX_SESSIONS_PER_USER,
  MAX_SESSIONS_PER_HOUR,
);

// ── HTTP routes ───────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    activeSessions: sessionManager.activeCount,
    maxSessions: MAX_SESSIONS,
    authProvider: AUTH_PROVIDER,
  });
});

/**
 * GET /api/sessions — list the current user's sessions.
 * Requires authentication. Admins see all sessions.
 */
app.get("/api/sessions", authAdapter.requireAuth.bind(authAdapter), (req, res) => {
  const user = (req as express.Request & { user: AuthUser }).user;
  const sessions = user.isAdmin
    ? sessionManager.getAllSessions()
    : sessionManager.getUserSessions(user.id);
  res.json(sessions);
});

/**
 * DELETE /api/sessions/:token — kill a session.
 * Users may only kill their own sessions; admins may kill any session.
 */
app.delete(
  "/api/sessions/:token",
  authAdapter.requireAuth.bind(authAdapter),
  (req, res) => {
    const { token } = req.params;
    const user = (req as express.Request & { user: AuthUser }).user;
    const session = sessionManager.getSession(token);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (!user.isAdmin && session.userId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    sessionManager.destroySession(token);
    res.status(204).end();
  },
);

// Admin routes — protected by admin-role check inside the router.
app.use(
  "/admin",
  authAdapter.requireAuth.bind(authAdapter),
  createAdminRouter(sessionManager, userStore),
);

// Static frontend (served last so auth/admin routes win).
const publicDir = path.join(import.meta.dirname, "public");
app.use(express.static(publicDir));

app.get("/", authAdapter.requireAuth.bind(authAdapter), (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ── WebSocket server ──────────────────────────────────────────────────────────

/**
 * Extend IncomingMessage to carry the authenticated user through from
 * verifyClient to the connection handler without re-authenticating.
 */
interface AuthedRequest extends IncomingMessage {
  _authUser?: AuthUser;
}

const rateLimiter = new ConnectionRateLimiter();
const rateLimiterCleanup = setInterval(() => rateLimiter.cleanup(), 5 * 60_000);

const wss = new WebSocketServer({
  server,
  path: "/ws",
  verifyClient: ({ req, origin }, callback) => {
    // Origin check
    if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`Rejected connection from origin: ${origin}`);
      callback(false, 403, "Forbidden origin");
      return;
    }

    // Authenticate the user
    const user = authAdapter.authenticate(req as IncomingMessage);
    if (!user) {
      console.warn("Rejected WebSocket connection: unauthenticated");
      callback(false, 401, "Unauthorized");
      return;
    }

    // IP-level rate limit (guards against connection floods from a single IP)
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";
    if (!rateLimiter.allow(ip)) {
      console.warn(`Rate limited connection from ${ip}`);
      callback(false, 429, "Too many connections");
      return;
    }

    // Per-user rate limit (hourly new-session quota)
    if (sessionManager.isUserRateLimited(user.id)) {
      const retryAfter = sessionManager.retryAfterSeconds(user.id);
      console.warn(`Per-user rate limit for ${user.id}`);
      callback(false, 429, "Too Many Requests", { "Retry-After": String(retryAfter) });
      return;
    }

    // Per-user concurrent session limit
    if (sessionManager.isUserAtConcurrentLimit(user.id)) {
      console.warn(`Concurrent session limit reached for ${user.id}`);
      callback(false, 429, "Session limit reached");
      return;
    }

    // Attach user to request for the connection handler
    (req as AuthedRequest)._authUser = user;
    callback(true);
  },
});

wss.on("connection", (ws, req) => {
  const user = (req as AuthedRequest)._authUser;
  if (!user) {
    // Should never happen — verifyClient already checked, but be safe.
    ws.close(1008, "Unauthenticated");
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";
  console.log(`New WebSocket connection from ${ip} (user: ${user.id})`);

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const cols = parseInt(url.searchParams.get("cols") ?? "80", 10);
  const rows = parseInt(url.searchParams.get("rows") ?? "24", 10);
  const resumeToken = url.searchParams.get("resume");

  // Try to resume an existing session owned by this user
  if (resumeToken) {
    const stored = sessionManager.getSession(resumeToken);
    // Users may only resume their own sessions (admins can resume any)
    if (stored && (user.isAdmin || stored.userId === user.id)) {
      const resumed = sessionManager.resume(resumeToken, ws, cols, rows);
      if (resumed) return;
    }
    console.log(
      `[resume] Session ${resumeToken.slice(0, 8)}… not found or not owned — starting fresh`,
    );
  }

  // Global capacity check
  if (sessionManager.isFull) {
    ws.send(JSON.stringify({ type: "error", message: "Max sessions reached. Try again later." }));
    ws.close(1013, "Max sessions reached");
    return;
  }

  const token = sessionManager.create(ws, cols, rows, user);
  if (token) {
    // Track the user in the user store
    userStore.touch(user.id, { email: user.email, name: user.name });

    // Release the user slot when this session ends
    const stored = sessionManager.getSession(token);
    if (stored) {
      stored.pty.onExit(() => userStore.release(user.id));
    }

    ws.send(JSON.stringify({ type: "session", token }));
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function shutdown() {
  console.log("Shutting down...");
  clearInterval(rateLimiterCleanup);
  sessionManager.destroyAll();
  wss.close(() => {
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ── Start ─────────────────────────────────────────────────────────────────────

server.listen(PORT, HOST, () => {
  console.log(`PTY server listening on http://${HOST}:${PORT}`);
  console.log(`  WebSocket: ws://${HOST}:${PORT}/ws`);
  console.log(`  Max sessions: ${MAX_SESSIONS} (${MAX_SESSIONS_PER_USER} per user)`);
  console.log(`  Session grace period: ${GRACE_PERIOD_MS / 1000}s`);
  console.log(`  Scrollback buffer: ${Math.round(SCROLLBACK_BYTES / 1024)}KB per session`);
  console.log(`  Auth provider: ${AUTH_PROVIDER}`);
  if (AUTH_PROVIDER === "token" && process.env.AUTH_TOKEN) {
    console.log("  Auth: token required");
  }
  if (process.env.ADMIN_USERS) {
    console.log(`  Admins: ${process.env.ADMIN_USERS}`);
  }
});

export { app, server, sessionManager, wss };
