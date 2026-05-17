import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ServerState } from "../types.js";
import { handleGetPrompt, PROMPT_DEFINITIONS } from "../prompts/index.js";

export function registerPromptHandlers(
  server: Server,
  state: ServerState,
): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPT_DEFINITIONS,
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleGetPrompt(name, args ?? {}, state);
  });
}
