import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_RESULTS = [
  "OPTIMAL_TRADE_CLOSE",
  "ACTUAL_TP_HIT",
  "ACTUAL_SL_NOT_HIT",
  "NA",
];

export async function PATCH(req) {
  try {
    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = await req.json();

    const journalId = String(body.journalId || "").trim();
    const aftermathResult = String(body.aftermath_result || "")
      .trim()
      .toUpperCase();

    const aftermathDateRaw = String(body.aftermath_date || "").trim();
    const aftermathUserNote = String(body.aftermath_user_note || "").trim();
    const aftermathMentorNote = String(body.aftermath_mentor_note || "").trim();

    if (!journalId) {
      return NextResponse.json({
        ok: false,
        message: "Journal ID is required.",
      });
    }

    if (!ALLOWED_RESULTS.includes(aftermathResult)) {
      return NextResponse.json({
        ok: false,
        message: "Invalid aftermath result.",
      });
    }

    const aftermath_date = aftermathDateRaw
      ? new Date(aftermathDateRaw).toISOString()
      : null;

    const { data, error } = await supabase
      .from("journals")
      .update({
        aftermath_result: aftermathResult,
        aftermath_date,
        aftermath_user_note: aftermathUserNote || null,
        aftermath_mentor_note: aftermathMentorNote || null,
        aftermath_updated_at: new Date().toISOString(),
      })
      .eq("id", journalId)
      .eq("user_id", user.id)
      .select(
        `
        id,
        aftermath_result,
        aftermath_date,
        aftermath_user_note,
        aftermath_mentor_note,
        aftermath_updated_at
        `,
      )
      .single();

    if (error) {
      return NextResponse.json({
        ok: false,
        message: error.message,
      });
    }

    return NextResponse.json({
      ok: true,
      journal: data,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err?.message || "Something went wrong.",
    });
  }
}
