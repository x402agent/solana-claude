---
name: bluebubbles
description: Use when you need to send or manage iMessages via BlueBubbles (recommended iMessage integration). Calls go through the generic message tool with channel="bluebubbles".
metadata: { "solanaos": { "emoji": "🫧", "requires": { "config": ["channels.bluebubbles"] } } }
---

# BlueBubbles Actions

## Overview

BlueBubbles is SolanaOS's recommended iMessage integration. Use the `message` tool with `channel: "bluebubbles"` to send messages and manage iMessage conversations: send texts and attachments, react (tapbacks), edit/unsend, reply in threads, and manage group participants/names/icons.

## Inputs to collect

- `target` (prefer `chat_guid:...`; also `+15551234567` in E.164 or `user@example.com`)
- `message` text for send/edit/reply
- `messageId` for react/edit/unsend/reply
- Attachment `path` for local files, or `buffer` + `filename` for base64

If the user is vague ("text my mom"), ask for the recipient handle or chat guid and the exact message content.

## Daemon Integration

BlueBubbles is a first-class channel in the SolanaOS Go daemon (`pkg/channels/bluebubbles/`). Configure via env vars:

```bash
BLUEBUBBLES_SERVER_URL=http://localhost:1234   # Your BlueBubbles server
BLUEBUBBLES_PASSWORD=your-server-password
BLUEBUBBLES_WEBHOOK_PATH=/webhooks/bb          # Optional webhook endpoint
BLUEBUBBLES_ALLOW_FROM=+17324063563            # Optional sender allowlist
```

Or in your config JSON:

```json
{
  "channels": {
    "bluebubbles": {
      "enabled": true,
      "server_url": "http://localhost:1234",
      "password": "your-server-password",
      "webhook_path": "/webhooks/bb",
      "allow_from": ["+17324063563"]
    }
  }
}
```

The daemon polls for new inbound iMessages every 5 seconds and routes them through the same OODA agent loop as Telegram and X messages.

## Claude Code Channels Automation

BlueBubbles can also be used as a Claude Code channel plugin for push-event automation. With channels enabled, iMessages arrive directly in your running Claude Code session:

```bash
# Install the iMessage channel plugin
/plugin install imessage@claude-plugins-official

# Restart with channels enabled
claude --channels plugin:imessage@claude-plugins-official

# Or combine with Telegram
claude --channels plugin:telegram@claude-plugins-official plugin:imessage@claude-plugins-official
```

This lets you:
- Push iMessages into a running session so Claude can react while you're away
- Use Claude as a two-way iMessage bridge — it reads the event and replies back through BlueBubbles
- Forward alerts, CI results, and monitoring events via iMessage

## Actions

### Send a message

```json
{
  "action": "send",
  "channel": "bluebubbles",
  "target": "+17324063563",
  "message": "hello from SolanaOS"
}
```

### React (tapback)

```json
{
  "action": "react",
  "channel": "bluebubbles",
  "target": "+17324063563",
  "messageId": "<message-guid>",
  "emoji": "❤️"
}
```

### Remove a reaction

```json
{
  "action": "react",
  "channel": "bluebubbles",
  "target": "+17324063563",
  "messageId": "<message-guid>",
  "emoji": "❤️",
  "remove": true
}
```

### Edit a previously sent message

```json
{
  "action": "edit",
  "channel": "bluebubbles",
  "target": "+17324063563",
  "messageId": "<message-guid>",
  "message": "updated text"
}
```

### Unsend a message

```json
{
  "action": "unsend",
  "channel": "bluebubbles",
  "target": "+17324063563",
  "messageId": "<message-guid>"
}
```

### Reply to a specific message

```json
{
  "action": "reply",
  "channel": "bluebubbles",
  "target": "+17324063563",
  "replyTo": "<message-guid>",
  "message": "replying to that"
}
```

### Send an attachment

```json
{
  "action": "sendAttachment",
  "channel": "bluebubbles",
  "target": "+17324063563",
  "path": "/tmp/photo.jpg",
  "caption": "here you go"
}
```

### Send with an iMessage effect

```json
{
  "action": "sendWithEffect",
  "channel": "bluebubbles",
  "target": "+17324063563",
  "message": "big news",
  "effect": "balloons"
}
```

## Notes

- Requires gateway config `channels.bluebubbles` (serverUrl/password/webhookPath).
- Prefer `chat_guid` targets when you have them (especially for group chats).
- BlueBubbles supports rich actions, but some are macOS-version dependent (for example, edit may be broken on macOS 26 Tahoe).
- The gateway may expose both short and full message ids; full ids are more durable across restarts.
- Developer reference for the underlying plugin lives in `extensions/bluebubbles/README.md`.
- Go daemon implementation lives in `pkg/channels/bluebubbles/bluebubbles.go`.

## Ideas to try

- React with a tapback to acknowledge a request.
- Reply in-thread when a user references a specific message.
- Send a file attachment with a short caption.
- Set up Claude Code channels for two-way iMessage automation while you're away from the terminal.
