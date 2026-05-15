import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");
}

export async function PATCH(request) {
  try {
    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const journalId = body?.journalId;
    const type = body?.type;
    const note = sanitizeHtml(body?.note);

    if (!journalId || !["owner", "admin"].includes(type)) {
      return NextResponse.json(
        { ok: false, message: "Invalid request" },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("type")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.type === "admin";

    const { data: journal, error: journalError } = await supabase
      .from("journals")
      .select("id, user_id")
      .eq("id", journalId)
      .single();

    if (journalError || !journal) {
      return NextResponse.json(
        { ok: false, message: "Journal not found" },
        { status: 404 },
      );
    }

    if (type === "owner" && journal.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, message: "Only the journal owner can edit owner note." },
        { status: 403 },
      );
    }

    if (type === "admin" && !isAdmin) {
      return NextResponse.json(
        { ok: false, message: "Only admin can edit admin note." },
        { status: 403 },
      );
    }

    const updatePayload =
      type === "owner"
        ? {
            owner_note: note,
            owner_note_updated_at: new Date().toISOString(),
          }
        : {
            admin_note: note,
            admin_note_updated_at: new Date().toISOString(),
          };

    const { error: updateError } = await supabase
      .from("journals")
      .update(updatePayload)
      .eq("id", journalId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, message: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      note,
      type,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Something went wrong" },
      { status: 500 },
    );
  }
}
