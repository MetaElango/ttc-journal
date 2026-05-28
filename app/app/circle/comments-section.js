"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Reply, Save, Trash2, Pencil } from "lucide-react";

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

function getName(comment) {
  return (
    comment?.profiles?.full_name || comment?.profiles?.username || "Trader"
  );
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  isAdmin,
  onReply,
  onEdit,
  onDelete,
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [editText, setEditText] = useState(comment.comment || "");

  const canModify = comment.user_id === currentUserId || isAdmin;

  const canEdit = comment.user_id === currentUserId;

  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{getName(comment)}</div>

          <div className="mt-1 text-xs text-muted-foreground">
            {formatDate(comment.created_at)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditOpen((v) => !v)}
              className="rounded-lg border p-2 hover:bg-accent"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}

          {canModify ? (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="rounded-lg border p-2 hover:bg-accent"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {editOpen ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none"
          />

          <button
            type="button"
            onClick={async () => {
              await onEdit(comment.id, editText);
              setEditOpen(false);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
          {comment.comment}
        </p>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setReplyOpen((v) => !v)}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Reply className="h-3.5 w-3.5" />
          Reply
        </button>
      </div>

      {replyOpen ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write a reply..."
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none"
          />

          <button
            type="button"
            onClick={async () => {
              await onReply(comment.id, replyText);

              setReplyText("");
              setReplyOpen(false);
            }}
            className="h-9 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            Reply
          </button>
        </div>
      ) : null}

      {replies.length > 0 ? (
        <div className="mt-4 space-y-3 border-l pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CommentsSection({
  journalId,
  onParentCountChange,
  hidden = false,
}) {
  const [comments, setComments] = useState([]);

  const [currentUserId, setCurrentUserId] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [newComment, setNewComment] = useState("");

  const [loading, setLoading] = useState(true);

  async function loadComments() {
    try {
      setLoading(true);

      const res = await fetch(`/api/journals/comments?journalId=${journalId}`);

      const json = await res.json();

      if (json.ok) {
        setComments(json.comments || []);
        setCurrentUserId(json.currentUserId || "");
        setIsAdmin(!!json.isAdmin);
      }
    } catch (error) {
      console.error("COMMENTS LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
  }, [journalId]);

  const { parents, repliesByParent } = useMemo(() => {
    const parents = comments.filter((c) => !c.parent_comment_id);

    const replies = comments.filter((c) => c.parent_comment_id);

    const repliesByParent = replies.reduce((acc, reply) => {
      if (!acc[reply.parent_comment_id]) {
        acc[reply.parent_comment_id] = [];
      }

      acc[reply.parent_comment_id].push(reply);

      return acc;
    }, {});

    return {
      parents,
      repliesByParent,
    };
  }, [comments]);

  useEffect(() => {
    onParentCountChange?.(parents.length);
  }, [parents.length, onParentCountChange]);

  async function createComment(parentCommentId = null, text = "") {
    const comment = String(text || "").trim();

    if (!comment) return;

    try {
      const res = await fetch("/api/journals/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          journalId,
          parentCommentId,
          comment,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        alert(json.message || "Failed to add comment.");
        return;
      }

      setComments((prev) => [...prev, json.comment]);
    } catch (error) {
      console.error(error);
    }
  }

  async function editComment(commentId, text) {
    const comment = String(text || "").trim();

    if (!comment) return;

    try {
      const res = await fetch("/api/journals/comments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId,
          comment,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        alert(json.message || "Failed to edit comment.");
        return;
      }

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                comment: json.comment.comment,
                updated_at: json.comment.updated_at,
              }
            : c,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteComment(commentId) {
    const yes = window.confirm("Delete this comment?");

    if (!yes) return;

    try {
      const res = await fetch("/api/journals/comments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        alert(json.message || "Failed to delete comment.");

        return;
      }

      setComments((prev) =>
        prev.filter(
          (c) => c.id !== commentId && c.parent_comment_id !== commentId,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  }

  if (hidden) return null;

  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          Comments
        </div>

        <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          {parents.length}
        </span>
      </div>

      <div className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="Add a comment..."
          className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none"
        />

        <button
          type="button"
          onClick={async () => {
            await createComment(null, newComment);

            setNewComment("");
          }}
          className="h-9 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground"
        >
          Post Comment
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading comments...
        </p>
      ) : parents.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No comments yet. Start the discussion.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {parents.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={repliesByParent[comment.id] || []}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onReply={createComment}
              onEdit={editComment}
              onDelete={deleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
