#!/usr/bin/env node
import('../dist/cli.js').catch((err) => {
  console.error('clawd-memory failed to load:', err.message);
  process.exit(1);
});
