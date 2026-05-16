/**
 * Social Client Factory
 *
 * Creates a SocialClient for the automaton runtime.
 * Self-contained: uses viem for signing and fetch for HTTP.
 */

import {
  type PrivateKeyAccount,
  keccak256,
  toBytes,
} from "viem";
import type { SocialClientInterface, InboxMessage } from "../types.js";

/**
 * Create a SocialClient wired to the agent's wallet.
 */
export function createSocialClient(
  relayUrl: string,
  account: PrivateKeyAccount,
): SocialClientInterface {
  const baseUrl = relayUrl.replace(/\/$/, "");

  return {
    send: async (
      to: string,
      content: string,
      replyTo?: string,
    ): Promise<{ id: string }> => {
      const signedAt = new Date().toISOString();
      const contentHash = keccak256(toBytes(content));
      const canonical = `Conway:send:${to.toLowerCase()}:${contentHash}:${signedAt}`;
      const signature = await account.signMessage({ message: canonical });

      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: account.address.toLowerCase(),
          to: to.toLowerCase(),
          content,
          signature,
          signed_at: signedAt,
          reply_to: replyTo,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          `Send failed (${res.status}): ${(err as any).error || res.statusText}`,
        );
      }

      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },

    poll: async (
      cursor?: string,
      limit?: number,
    ): Promise<{ messages: InboxMessage[]; nextCursor?: string }> => {
      const timestamp = new Date().toISOString();
      const canonical = `Conway:poll:${account.address.toLowerCase()}:${timestamp}`;
      const signature = await account.signMessage({ message: canonical });

      const res = await fetch(`${baseUrl}/v1/messages/poll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wallet-Address": account.address.toLowerCase(),
          "X-Signature": signature,
          "X-Timestamp": timestamp,
        },
        body: JSON.stringify({ cursor, limit }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          `Poll failed (${res.status}): ${(err as any).error || res.statusText}`,
        );
      }

      const data = (await res.json()) as {
        messages: Array<{
          id: string;
          from: string;
          to: string;
          content: string;
          signedAt: string;
          createdAt: string;
          replyTo?: string;
        }>;
        next_cursor?: string;
      };

      return {
        messages: data.messages.map((m) => ({
          id: m.id,
          from: m.from,
          to: m.to,
          content: m.content,
          signedAt: m.signedAt,
          createdAt: m.createdAt,
          replyTo: m.replyTo,
        })),
        nextCursor: data.next_cursor,
      };
    },

    unreadCount: async (): Promise<number> => {
      const timestamp = new Date().toISOString();
      const canonical = `Conway:poll:${account.address.toLowerCase()}:${timestamp}`;
      const signature = await account.signMessage({ message: canonical });

      const res = await fetch(`${baseUrl}/v1/messages/count`, {
        method: "GET",
        headers: {
          "X-Wallet-Address": account.address.toLowerCase(),
          "X-Signature": signature,
          "X-Timestamp": timestamp,
        },
      });

      if (!res.ok) return 0;

      const data = (await res.json()) as { unread: number };
      return data.unread;
    },
  };
}
