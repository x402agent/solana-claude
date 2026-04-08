"use client";

import { useState } from "react";
import {
  CheckCheck,
  CornerDownRight,
  MessageSquareText,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, cn } from "@/lib/utils";
import { useCollaborationContextOptional } from "./CollaborationProvider";

interface AnnotationThreadProps {
  messageId: string;
  onClose: () => void;
}

export function AnnotationThread({
  messageId,
  onClose,
}: AnnotationThreadProps) {
  const ctx = useCollaborationContextOptional();
  const [draft, setDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  if (!ctx) return null;

  const annotations = [...(ctx.annotations[messageId] ?? [])].sort(
    (left, right) => left.createdAt - right.createdAt
  );

  const canComment = ctx.myRole !== null && ctx.myRole !== "viewer";
  const unresolvedCount = annotations.filter((annotation) => !annotation.resolved).length;

  const submitAnnotation = () => {
    const text = draft.trim();
    if (!text || !canComment) return;
    ctx.addAnnotation(messageId, text);
    setDraft("");
  };

  const submitReply = (annotationId: string) => {
    const text = replyDrafts[annotationId]?.trim();
    if (!text || !canComment) return;
    ctx.replyAnnotation(annotationId, text);
    setReplyDrafts((current) => ({ ...current, [annotationId]: "" }));
    setActiveReplyId(null);
  };

  return (
    <div className="rounded-2xl border border-surface-700 bg-surface-950/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-surface-100">Thread</div>
          <div className="text-xs text-surface-400">
            {annotations.length} comment{annotations.length === 1 ? "" : "s"}
            {" · "}
            {unresolvedCount} open
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-surface-400 transition hover:bg-surface-800 hover:text-surface-100"
          aria-label="Close annotation thread"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto p-4">
        {annotations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-700 bg-surface-900/80 p-4 text-sm text-surface-400">
            No comments yet for this message.
          </div>
        ) : (
          annotations.map((annotation) => (
            <article
              key={annotation.id}
              className="rounded-xl border border-surface-800 bg-surface-900/90 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: annotation.author.color }}
                    />
                    <span className="truncate text-sm font-medium text-surface-100">
                      {annotation.author.name}
                    </span>
                    <span className="text-xs text-surface-500">
                      {formatDate(annotation.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-surface-200">
                    {annotation.text}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canComment}
                  onClick={() =>
                    ctx.resolveAnnotation(annotation.id, !annotation.resolved)
                  }
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition",
                    annotation.resolved
                      ? "border-emerald-700/60 bg-emerald-950/60 text-emerald-300"
                      : "border-amber-700/60 bg-amber-950/40 text-amber-300 hover:bg-amber-950/60",
                    !canComment && "cursor-not-allowed opacity-60"
                  )}
                >
                  <CheckCheck className="h-3 w-3" />
                  {annotation.resolved ? "Resolved" : "Open"}
                </button>
              </div>

              {annotation.replies.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-surface-800 pt-3">
                  {annotation.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex gap-2 rounded-lg bg-surface-950/80 px-3 py-2"
                    >
                      <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-surface-600" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: reply.author.color }}
                          />
                          <span className="text-xs font-medium text-surface-200">
                            {reply.author.name}
                          </span>
                          <span className="text-xs text-surface-500">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-surface-300">
                          {reply.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-surface-800 pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!canComment}
                  onClick={() =>
                    setActiveReplyId((current) =>
                      current === annotation.id ? null : annotation.id
                    )
                  }
                >
                  <MessageSquareText className="mr-1 h-3.5 w-3.5" />
                  Reply
                </Button>
              </div>

              {activeReplyId === annotation.id && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={replyDrafts[annotation.id] ?? ""}
                    onChange={(event) =>
                      setReplyDrafts((current) => ({
                        ...current,
                        [annotation.id]: event.target.value,
                      }))
                    }
                    placeholder="Add a reply..."
                    autoGrow
                    maxCount={500}
                    disabled={!canComment}
                    className="min-h-[88px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveReplyId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => submitReply(annotation.id)}
                      disabled={!canComment || !(replyDrafts[annotation.id] ?? "").trim()}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <div className="border-t border-surface-800 p-4">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            canComment
              ? "Add a comment to this message..."
              : "View-only access: commenting disabled."
          }
          autoGrow
          maxCount={700}
          disabled={!canComment}
          className="min-h-[96px]"
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            onClick={submitAnnotation}
            disabled={!canComment || !draft.trim()}
          >
            <Send className="mr-2 h-4 w-4" />
            Add Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
