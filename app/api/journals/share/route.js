import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const { journalId } = await request.json();

    if (!journalId) {
      return NextResponse.json(
        { ok: false, message: "journalId is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { error } = await supabase
      .from("journals")
      .update({
        is_shared: true,
        shared_at: new Date().toISOString(),
      })
      .eq("id", journalId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Journal shared.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error.message || "Something went wrong." },
      { status: 500 },
    );
  }
}
