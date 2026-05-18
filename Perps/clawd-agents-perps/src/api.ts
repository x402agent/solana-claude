import { buildPerpsFrontendStatus } from "./frontend.js";
import { ClawdPerpsRuntime } from "./marketMaker.js";
import { handleTelegramPerpsCommand } from "./telegram.js";

export async function getPerpsStatusApi(runtime: ClawdPerpsRuntime) {
  const status = await buildPerpsFrontendStatus(runtime);
  return {
    ok: true,
    surface: "perps-status",
    status,
  };
}

export async function postTelegramPerpsApi(runtime: ClawdPerpsRuntime, text: string) {
  const response = await handleTelegramPerpsCommand(runtime, text);
  return {
    ok: response.ok,
    surface: "telegram-perps",
    response,
  };
}
