"use client";

import { MessageSquarePlus } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { extractTextContent, formatDate, cn } from "@/lib/utils";

export function ChatHistory() {
  const {
    conversations,
    activeConversationId,
    createConversation,
    setActiveConversation,
    pinnedIds,
  } = useChatStore();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-800 p-3">
        <button
          type="button"
          onClick={() => createConversation()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-300 transition hover:bg-brand-500/20"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Conversation
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-700 bg-surface-900/70 p-4 text-sm text-surface-400">
            No conversations yet. Start with a prompt or open the solana-clawd landing page.
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const lastMessage = conversation.messages[conversation.messages.length - 1];
              const preview = lastMessage
                ? extractTextContent(lastMessage.content) || "Tool result"
                : "Empty conversation";

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversation(conversation.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    activeConversationId === conversation.id
                      ? "border-brand-500/40 bg-brand-500/10"
                      : "border-surface-800 bg-surface-900/70 hover:border-surface-700 hover:bg-surface-900"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-medium text-surface-100">
                      {conversation.title}
                    </div>
                    {pinnedIds.includes(conversation.id) && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                        pinned
                      </span>
                    )}
                  </div>
                  <div className="mt-2 line-clamp-2 text-xs leading-5 text-surface-400">
                    {preview}
                  </div>
                  <div className="mt-3 text-[11px] text-surface-500">
                    {formatDate(conversation.updatedAt)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
