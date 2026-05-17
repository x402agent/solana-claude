import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ServerState } from "../types.js";
import { handleReadResource } from "../resources/index.js";
import { listKeypairResources } from "../resources/keypair.js";

const STATIC_RESOURCES = [
  {
    uri: "solana://config",
    name: "Server Configuration",
    description: "Current MCP server configuration and capabilities",
    mimeType: "application/json",
  },
];

const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "solana://keypair/{id}",
    name: "Keypair",
    description: "Access a generated keypair by ID (public info only)",
    mimeType: "application/json",
  },
  {
    uriTemplate: "solana://address/{pubkey}",
    name: "Address Info",
    description: "Get validation info about a Solana address",
    mimeType: "application/json",
  },
];

export function registerResourceHandlers(
  server: Server,
  state: ServerState,
): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const keypairResources = listKeypairResources(state);
    return { resources: [...STATIC_RESOURCES, ...keypairResources] };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: RESOURCE_TEMPLATES,
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    return handleReadResource(uri, state);
  });
}
