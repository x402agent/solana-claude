import type { VenueAdapter } from "./adapter.js";
import { PhoenixAdapter } from "./phoenix.js";
import { FlashAdapter } from "./flash.js";
import { JupiterAdapter } from "./jupiter.js";
import { GMTradeAdapter } from "./gmtrade.js";
import { ImperialTransport } from "./transport.js";
import type { VenueId } from "../types.js";

/** Build the standard set of Imperial-backed adapters. */
export function buildVenueAdapters(
  transport: ImperialTransport,
  enabled: VenueId[] = ["phoenix", "flash", "jupiter", "gmtrade"],
): Record<VenueId, VenueAdapter> {
  const all: Record<VenueId, VenueAdapter> = {
    phoenix: new PhoenixAdapter(transport),
    flash: new FlashAdapter(transport),
    jupiter: new JupiterAdapter(transport),
    gmtrade: new GMTradeAdapter(transport),
  };
  const out = {} as Record<VenueId, VenueAdapter>;
  for (const id of enabled) {
    if (all[id]) out[id] = all[id];
  }
  return out;
}

export { PhoenixAdapter, FlashAdapter, JupiterAdapter, GMTradeAdapter, ImperialTransport };
