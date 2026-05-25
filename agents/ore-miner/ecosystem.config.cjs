/**
 * PM2 Ecosystem Config — Clawd ORE Mining Agent
 *
 * Runs the ore-miner agent + live dashboard 24/7.
 * Loads env from .env automatically (Node 20+ process.loadEnvFile).
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs          # start
 *   pm2 restart ore-miner                   # restart
 *   pm2 logs ore-miner                      # tail logs
 *   pm2 monit                               # monitor
 *   pm2 save && pm2 startup                 # survive reboots
 */

const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'ore-miner',
      script: 'node',
      args: '--import tsx/esm src/index.ts --mine',
      cwd: __dirname,
      interpreter: 'none',

      // ── Restart policy ──────────────────────────────────────────
      autorestart: true,
      watch: false,
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 5000,        // 5s between restarts
      exp_backoff_restart_delay: 100,

      // ── Logs ────────────────────────────────────────────────────
      log_file: path.join(__dirname, 'ore-miner.live.log'),
      out_file: path.join(__dirname, 'ore-miner.log'),
      error_file: path.join(__dirname, 'ore-miner.err.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // ── Env ─────────────────────────────────────────────────────
      // .env is loaded by process.loadEnvFile() inside index.ts.
      // Setting NODE_ENV here so PM2 also knows the environment.
      env: {
        NODE_ENV: 'production',
        // Force colour output in logs
        FORCE_COLOR: '1',
      },

      // ── Health / memory guard ───────────────────────────────────
      // Restart if the process exceeds 1.5 GB RAM
      max_memory_restart: '1500M',

      // ── Cluster / instances ──────────────────────────────────────
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
