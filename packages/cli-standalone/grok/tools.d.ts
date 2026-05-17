import { GrokTool } from "./client.js";
import { MCPManager, MCPTool } from "../mcp/client.js";
export declare const GROK_TOOLS: GrokTool[];
export declare function getMCPManager(): MCPManager;
export declare function initializeMCPServers(): Promise<void>;
export declare function convertMCPToolToGrokTool(mcpTool: MCPTool): GrokTool;
export declare function addMCPToolsToGrokTools(baseTools: GrokTool[]): GrokTool[];
export declare function getAllGrokTools(): Promise<GrokTool[]>;
