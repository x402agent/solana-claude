/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as crons from "../crons.js";
import type * as dflowData from "../dflowData.js";
import type * as http from "../http.js";
import type * as marketConversations from "../marketConversations.js";
import type * as messages from "../messages.js";
import type * as perpsData from "../perpsData.js";
import type * as sessions from "../sessions.js";
import type * as solanaData from "../solanaData.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  crons: typeof crons;
  dflowData: typeof dflowData;
  http: typeof http;
  marketConversations: typeof marketConversations;
  messages: typeof messages;
  perpsData: typeof perpsData;
  sessions: typeof sessions;
  solanaData: typeof solanaData;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
