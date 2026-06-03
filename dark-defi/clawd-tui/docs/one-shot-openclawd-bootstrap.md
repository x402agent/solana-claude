# One-Shot OpenClawd Bootstrap Prompt

Use this prompt inside Claude Code, Codex, GHermes, OpenClaw, or any terminal
agent that already has shell access to the target workspace. It turns the
session into an OpenClawd setup operator: install the public CLIs, wire the TUI,
load Browser Use profile/workspace context, and bootstrap SSH access safely.

## One-Shot Commands

Run either path from a normal shell:

```bash
# TUI only, no install left behind
npx -y @openclawdsolana/clawd-tui
```

```bash
# Persistent TUI install
npm install -g @openclawdsolana/clawd-tui
clawd
```

When the OpenClawd installer endpoint is available, this is the intended full
stack path:

```bash
curl -fsSL https://solanaclawd.com/install | sh
clawd
```

## Agent Setup Prompt

Copy this whole block into the terminal agent:

```text
You are now my OpenClawd setup operator for this machine.

Goal:
- Install and verify OpenClawd, Clawd Code CLI, and Clawd TUI where available.
- Prefer one-shot public install paths: curl installer first, npm/npx fallback.
- Preserve existing files and secrets. Never print private keys or env values.
- Use Browser Use profile and workspace context when configuring remote browser
  workflows:
  BROWSER_PROFILE=ce04f825-b559-4019-9f05-cdbd2c1b7554
  BROWSER_PROFILE_ID=ce04f825-b559-4019-9f05-cdbd2c1b7554
  BROWSER_USE_WORKSPACE_ID=e112d4ea-a250-4036-8ed7-f66c564911b5

Install flow:
1. Check for node, npm, npx, git, curl, ssh, and bash.
2. Try the public OpenClawd installer:
   curl -fsSL https://solanaclawd.com/install | sh
3. If the installer is unavailable, use npm/npx fallbacks:
   npm install -g @openclawdsolana/clawd-tui
   npx -y @openclawdsolana/clawd-tui --help
4. If a Clawd Code CLI package is published in npm metadata or this repo,
   install or link it according to the package instructions. Do not guess
   unpublished package names as a destructive global install.
5. Verify commands without exposing secrets:
   clawd --help
   clawd-tui --help
6. If this workspace contains OpenClawd source, install dependencies with the
   repo's preferred package manager and run its safe checks.

SSH bootstrap:
Pubkey-only auth is enabled on this box, so ssh-copy-id cannot bootstrap access.
You already have shell access here. Walk me through key installation:

1. Ask me to run this on my laptop:
   cat ~/.ssh/id_ed25519.pub
2. If that file does not exist, tell me to try:
   cat ~/.ssh/id_rsa.pub
3. If I do not have an SSH key yet, tell me to create one on my laptop:
   ssh-keygen -t ed25519 -C "openclawd-access"
   Then tell me to run:
   cat ~/.ssh/id_ed25519.pub
4. Wait for me to paste the single-line public key.
5. Validate that it looks like a public key beginning with ssh-ed25519 or
   ssh-rsa. Reject anything that looks like a private key.
6. On this box, append the public key to ~/.ssh/authorized_keys with safe perms:
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   printf '%s\n' '<PASTED_PUBLIC_KEY>' >> ~/.ssh/authorized_keys
   sort -u ~/.ssh/authorized_keys -o ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
7. Confirm without leaking unrelated secrets:
   tail -n 3 ~/.ssh/authorized_keys
   stat -f '%Sp %N' ~/.ssh ~/.ssh/authorized_keys 2>/dev/null || stat -c '%a %n' ~/.ssh ~/.ssh/authorized_keys
8. Tell me to test from my laptop:
   ssh bux@<this-box-ip>
9. If the IP is unknown, help discover it with:
   hostname -I 2>/dev/null || ipconfig getifaddr en0 2>/dev/null || ifconfig

Rules:
- Do not overwrite authorized_keys.
- Do not request or store a private key.
- Do not weaken SSH to password auth.
- Do not run destructive commands without asking first.
- Summarize each completed install and verification step.
```

## Browser Use Context

Use these environment names consistently when bridging OpenClawd to Browser Use:

```bash
BROWSER_PROFILE=ce04f825-b559-4019-9f05-cdbd2c1b7554
BROWSER_PROFILE_ID=ce04f825-b559-4019-9f05-cdbd2c1b7554
BROWSER_USE_WORKSPACE_ID=e112d4ea-a250-4036-8ed7-f66c564911b5
```

`BROWSER_PROFILE` is the short alias; `BROWSER_PROFILE_ID` is the explicit
Browser Use field name. Keep both set for compatibility across scripts.
