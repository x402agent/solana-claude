"use client";

import Link from "next/link";
import { Plus, Settings, Sparkles } from "lucide-react";
import { useChatStore } from "@/lib/store";

export function QuickActions() {
  const { createConversation, openSettings } = useChatStore();

  return (
    <div className="border-t border-surface-800 p-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-surface-500">
        Quick Actions
      </div>
      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => createConversation()}
          className="flex items-center gap-2 rounded-lg border border-surface-800 bg-surface-900/80 px-3 py-2 text-sm text-surface-200 transition hover:border-surface-700 hover:bg-surface-900"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
        <button
          type="button"
          onClick={openSettings}
          className="flex items-center gap-2 rounded-lg border border-surface-800 bg-surface-900/80 px-3 py-2 text-sm text-surface-200 transition hover:border-surface-700 hover:bg-surface-900"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <Link
          href="/buddies"
          className="flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-brand-300 transition hover:bg-brand-500/20"
        >
          <Sparkles className="h-4 w-4" />
          Blockchain buddies
        </Link>
      </div>
    </div>
  );
}
