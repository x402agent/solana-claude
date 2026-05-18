import { buildPerpsFrontendStatus } from "./frontend.js";
import { ClawdPerpsRuntime } from "./marketMaker.js";
import { handleTelegramPerpsCommand } from "./telegram.js";

export async function getPerpsStatusApi(runtime: ClawdPerpsRuntime) {
  return buildPerpsFrontendStatus(runtime);
}

export async function postTelegramPerpsApi(runtime: ClawdPerpsRuntime, text: string) {
  return handleTelegramPerpsCommand(runtime, text);
}
