import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const journalId = body?.journal_id;
  const reaction = body?.reaction;

  if (!journalId) {
    return NextResponse.json(
      { error: "journal_id is required" },
      { status: 400 },
    );
  }

  if (reaction === null) {
    const { error } = await supabase
      .from("journal_reactions")
      .delete()
      .eq("journal_id", journalId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reaction: null });
  }

  if (!["INTERESTED", "NO_IDEA"].includes(reaction)) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const { error } = await supabase.from("journal_reactions").upsert(
    {
      journal_id: journalId,
      user_id: user.id,
      reaction,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "journal_id,user_id",
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, reaction });
}
