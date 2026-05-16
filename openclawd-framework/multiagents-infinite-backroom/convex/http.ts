import { httpRouter } from 'convex/server';
import { handleReplicateWebhook } from './music';
import {
  registerHandler,
  heartbeatHandler,
  setDataHandler,
  getDataHandler,
  listDataHandler,
  getAgentHandler,
  listAgentsHandler,
  getActivityHandler,
} from './clawd/http';

const http = httpRouter();

// AI Town route
http.route({
  path: '/replicate_webhook',
  method: 'POST',
  handler: handleReplicateWebhook,
});

// ─── CLAWD Agent Routes ──────────────────────────────────────────

// Register/install an agent
http.route({
  path: '/clawd/register',
  method: 'POST',
  handler: registerHandler,
});

// Push a heartbeat
http.route({
  path: '/clawd/heartbeat',
  method: 'POST',
  handler: heartbeatHandler,
});

// Store data for an agent (key-value)
http.route({
  path: '/clawd/data',
  method: 'POST',
  handler: setDataHandler,
});

// Retrieve data for an agent
http.route({
  path: '/clawd/data',
  method: 'GET',
  handler: getDataHandler,
});

// List all data keys for an agent
http.route({
  path: '/clawd/data/list',
  method: 'GET',
  handler: listDataHandler,
});

// Get agent info + latest heartbeat
http.route({
  path: '/clawd/agent',
  method: 'GET',
  handler: getAgentHandler,
});

// List all agents
http.route({
  path: '/clawd/agents',
  method: 'GET',
  handler: listAgentsHandler,
});

// Get activity log for an agent
http.route({
  path: '/clawd/activity',
  method: 'GET',
  handler: getActivityHandler,
});

export default http;

