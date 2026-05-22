import type { VenueAdapter } from "./adapter.js";
import { PhoenixAdapter } from "./phoenix.js";
import { FlashAdapter } from "./flash.js";
import { JupiterAdapter } from "./jupiter.js";
import { GMTradeAdapter } from "./gmtrade.js";
import { TwammAdapter } from "./twamm.js";
import { ImperialTransport } from "./transport.js";
import type { VenueId } from "../types.js";

const DEFAULT_ENABLED: VenueId[] = ["phoenix", "flash", "jupiter", "gmtrade"];

/** Build the standard set of venue adapters. Pass "twamm" in enabled to include it. */
export function buildVenueAdapters(
  transport: ImperialTransport,
  enabled: VenueId[] = DEFAULT_ENABLED,
): Record<string, VenueAdapter> {
  const all: Record<string, VenueAdapter> = {
    phoenix: new PhoenixAdapter(transport),
    flash: new FlashAdapter(transport),
    jupiter: new JupiterAdapter(transport),
    gmtrade: new GMTradeAdapter(transport),
    twamm: new TwammAdapter(transport),
  };
  const out: Record<string, VenueAdapter> = {};
  for (const id of enabled) {
    if (all[id]) out[id] = all[id];
  }
  return out;
}

export { PhoenixAdapter, FlashAdapter, JupiterAdapter, GMTradeAdapter, TwammAdapter, ImperialTransport };
