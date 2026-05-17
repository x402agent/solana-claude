import { getSettingsManager } from "../utils/settings-manager.js";
import { MCPServerConfig } from "./client.js";

export interface MCPConfig {
  servers: MCPServerConfig[];
}

/**
 * Load MCP configuration from project settings
 */
export function loadMCPConfig(): MCPConfig {
  const manager = getSettingsManager();
  const projectSettings = manager.loadProjectSettings();
  const servers = projectSettings.mcpServers ? Object.values(projectSettings.mcpServers) : [];
  const payServer = payMCPServerFromEnv();
  if (payServer && !servers.some((server) => server.name === payServer.name)) {
    servers.push(payServer);
  }
  return { servers };
}

function payMCPServerFromEnv(): MCPServerConfig | undefined {
  if (process.env.CLAWD_PAY_ENABLED !== "1") return undefined;

  const command = process.env.CLAWD_PAY_MCP_COMMAND || "pay";
  const args = process.env.CLAWD_PAY_MCP_ARGS
    ? process.env.CLAWD_PAY_MCP_ARGS.split(/\s+/).filter(Boolean)
    : ["mcp"];
  const env: Record<string, string> = {};

  for (const key of [
    "PAY_ACTIVE_ACCOUNT",
    "PAY_RPC_URL",
    "PAY_NETWORK_ENFORCED",
    "PAY_DEBUGGER_PROXY",
  ]) {
    const value = process.env[key];
    if (value) env[key] = value;
  }

  return {
    name: "pay",
    command,
    args,
    env,
  };
}

export function saveMCPConfig(config: MCPConfig): void {
  const manager = getSettingsManager();
  const mcpServers: Record<string, MCPServerConfig> = {};

  // Convert servers array to object keyed by name
  for (const server of config.servers) {
    mcpServers[server.name] = server;
  }

  manager.updateProjectSetting('mcpServers', mcpServers);
}

export function addMCPServer(config: MCPServerConfig): void {
  const manager = getSettingsManager();
  const projectSettings = manager.loadProjectSettings();
  const mcpServers = projectSettings.mcpServers || {};

  mcpServers[config.name] = config;
  manager.updateProjectSetting('mcpServers', mcpServers);
}

export function removeMCPServer(serverName: string): void {
  const manager = getSettingsManager();
  const projectSettings = manager.loadProjectSettings();
  const mcpServers = projectSettings.mcpServers;

  if (mcpServers) {
    delete mcpServers[serverName];
    manager.updateProjectSetting('mcpServers', mcpServers);
  }
}

export function getMCPServer(serverName: string): MCPServerConfig | undefined {
  const manager = getSettingsManager();
  const projectSettings = manager.loadProjectSettings();
  return projectSettings.mcpServers?.[serverName];
}

// Predefined server configurations
export const PREDEFINED_SERVERS: Record<string, MCPServerConfig> = {};
