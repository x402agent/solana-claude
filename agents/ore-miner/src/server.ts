/**
 * server.ts — Live dashboard server for Clawd ORE Mining Agent.
 *
 * Starts an Express + Socket.io server that broadcasts CLAWD LOOP state
 * to connected browser clients. The agent calls `io.emit('state', ...)`.
 *
 * Usage: imported by agent.ts; also standalone via `node --import tsx/esm src/server.ts`
 */

import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface DashboardState {
  tick: number;
  round: number;
  miningOpen: boolean;
  miningSecondsRemaining: number;
  claimHoursRemaining: number;
  totalDeployed: string;
  totalMiners: number;
  motherlode: string;
  settled: boolean;
  winningSquare: number | null;
  squares: SquareState[];
  wallet: {
    pubkey: string;
    balanceSol: string;
    rewardsSol: string;
    rewardsOre: string;
    checkpointNeeded: boolean;
  } | null;
  agentAction: string;
  agentReasoning: string;
  loop: 'observe' | 'orient' | 'decide' | 'act' | 'idle';
  log: LogEntry[];
  dryRun: boolean;
  timestamp: number;
}

export interface SquareState {
  index: number;
  deployed: string;
  miners: number;
  ev: number;
  isUnderbet: boolean;
  isEmpty: boolean;
  myDeployment: string | null;
}

export interface LogEntry {
  ts: number;
  level: 'info' | 'action' | 'warn' | 'error';
  msg: string;
}

export function createDashboardServer(port = 3333): { io: SocketIOServer; url: string } {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.static(join(__dirname, 'public')));

  app.get('/', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });

  io.on('connection', (socket) => {
    console.log(`[dashboard] client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[dashboard] client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`[dashboard] live at http://localhost:${port}`);
  });

  return { io, url: `http://localhost:${port}` };
}
