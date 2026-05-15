import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getProfileMap(supabase, comments = []) {
  const userIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))];

  if (userIds.length === 0) return new Map();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, type")
    .in("id", userIds);

  return new Map((profiles || []).map((p) => [p.id, p]));
}

function attachProfiles(comments = [], profileMap) {
  return comments.map((comment) => ({
    ...comment,
    profiles: profileMap.get(comment.user_id) || null,
  }));
}

async function getCurrentUserAndProfile(supabase) {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, type, full_name, username")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

async function getSharedJournal(supabase, journalId) {
  const { data, error } = await supabase
    .from("journals")
    .select("id, is_shared")
    .eq("id", journalId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function GET(req) {
  const supabase = await createClient();

  const { user, profile } = await getCurrentUserAndProfile(supabase);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." });
  }

  const { searchParams } = new URL(req.url);
  const journalId = searchParams.get("journalId");

  if (!journalId) {
    return NextResponse.json({ ok: false, message: "journalId is required." });
  }

  const journal = await getSharedJournal(supabase, journalId);

  if (!journal) {
    return NextResponse.json({ ok: false, message: "Journal not found." });
  }

  if (!journal.is_shared) {
    return NextResponse.json({
      ok: false,
      message: "Comments are only available for shared journals.",
    });
  }

  const { data: comments, error } = await supabase
    .from("journal_comments")
    .select(
      `
      id,
      journal_id,
      user_id,
      parent_comment_id,
      comment,
      created_at,
      updated_at
      `,
    )
    .eq("journal_id", journalId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message });
  }

  const profileMap = await getProfileMap(supabase, comments || []);
  const commentsWithProfiles = attachProfiles(comments || [], profileMap);

  return NextResponse.json({
    ok: true,
    comments: commentsWithProfiles,
    currentUserId: user.id,
    isAdmin: profile?.type === "admin",
  });
}

export async function POST(req) {
  const supabase = await createClient();

  const { user } = await getCurrentUserAndProfile(supabase);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." });
  }

  const body = await req.json();

  const journalId = String(body.journalId || "").trim();
  const parentCommentId = body.parentCommentId
    ? String(body.parentCommentId).trim()
    : null;
  const comment = String(body.comment || "").trim();

  if (!journalId) {
    return NextResponse.json({ ok: false, message: "journalId is required." });
  }

  if (!comment) {
    return NextResponse.json({ ok: false, message: "Comment is required." });
  }

  const journal = await getSharedJournal(supabase, journalId);

  if (!journal) {
    return NextResponse.json({ ok: false, message: "Journal not found." });
  }

  if (!journal.is_shared) {
    return NextResponse.json({
      ok: false,
      message: "Comments are only available for shared journals.",
    });
  }

  if (parentCommentId) {
    const { data: parent, error: parentError } = await supabase
      .from("journal_comments")
      .select("id, journal_id, parent_comment_id")
      .eq("id", parentCommentId)
      .single();

    if (parentError || !parent) {
      return NextResponse.json({
        ok: false,
        message: "Parent comment not found.",
      });
    }

    if (parent.journal_id !== journalId) {
      return NextResponse.json({
        ok: false,
        message: "Parent comment does not belong to this journal.",
      });
    }

    if (parent.parent_comment_id) {
      return NextResponse.json({
        ok: false,
        message: "Replies can only be added to main comments.",
      });
    }
  }

  const { data: inserted, error } = await supabase
    .from("journal_comments")
    .insert({
      journal_id: journalId,
      user_id: user.id,
      parent_comment_id: parentCommentId,
      comment,
    })
    .select(
      `
      id,
      journal_id,
      user_id,
      parent_comment_id,
      comment,
      created_at,
      updated_at
      `,
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message });
  }

  const profileMap = await getProfileMap(supabase, [inserted]);
  const [commentWithProfile] = attachProfiles([inserted], profileMap);

  return NextResponse.json({
    ok: true,
    comment: commentWithProfile,
  });
}

export async function PATCH(req) {
  const supabase = await createClient();

  const { user } = await getCurrentUserAndProfile(supabase);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." });
  }

  const body = await req.json();

  const commentId = String(body.commentId || "").trim();
  const comment = String(body.comment || "").trim();

  if (!commentId) {
    return NextResponse.json({ ok: false, message: "commentId is required." });
  }

  if (!comment) {
    return NextResponse.json({ ok: false, message: "Comment is required." });
  }

  const { data: existing, error: existingError } = await supabase
    .from("journal_comments")
    .select("id, user_id")
    .eq("id", commentId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ ok: false, message: "Comment not found." });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({
      ok: false,
      message: "You can only edit your own comment.",
    });
  }

  const { data: updated, error } = await supabase
    .from("journal_comments")
    .update({
      comment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select(
      `
      id,
      journal_id,
      user_id,
      parent_comment_id,
      comment,
      created_at,
      updated_at
      `,
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message });
  }

  const profileMap = await getProfileMap(supabase, [updated]);
  const [commentWithProfile] = attachProfiles([updated], profileMap);

  return NextResponse.json({
    ok: true,
    comment: commentWithProfile,
  });
}

export async function DELETE(req) {
  const supabase = await createClient();

  const { user, profile } = await getCurrentUserAndProfile(supabase);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." });
  }

  const body = await req.json();
  const commentId = String(body.commentId || "").trim();

  if (!commentId) {
    return NextResponse.json({ ok: false, message: "commentId is required." });
  }

  const isAdmin = profile?.type === "admin";

  const { data: existing, error: existingError } = await supabase
    .from("journal_comments")
    .select("id, user_id")
    .eq("id", commentId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ ok: false, message: "Comment not found." });
  }

  if (existing.user_id !== user.id && !isAdmin) {
    return NextResponse.json({
      ok: false,
      message: "You can only delete your own comment.",
    });
  }

  const { error } = await supabase
    .from("journal_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message });
  }

  return NextResponse.json({ ok: true });
}
