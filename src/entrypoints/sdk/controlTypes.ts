/**
 * SDK Control Types for solana-claude
 * Control request/response types for SDK communication
 */

import type { SDKControlRequest } from '../agentSdkTypes.js';

// Re-export SDKControlRequest as SDKMessage for compatibility
export type SDKMessage = SDKControlRequest;

export interface SDKControlResponse {
  type: 'response';
  id: string;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export interface SDKResultSuccess {
  ok: true;
}

export interface SDKResultError {
  ok: false;
  error: string;
}

export type SDKResult = SDKResultSuccess | SDKResultError;

export interface ControlMessage {
  id: string;
  type: string;
  payload?: unknown;
}

export interface PermissionRequest {
  id: string;
  tool: string;
  input: unknown;
  message?: string;
}

export interface PermissionResponse {
  id: string;
  granted: boolean;
  reason?: string;
}