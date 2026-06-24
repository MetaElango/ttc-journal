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

    const formData = await req.formData();

    const journalId = String(formData.get("journalId") || "").trim();
    const aftermathResult = String(formData.get("aftermath_result") || "")
      .trim()
      .toUpperCase();

    const aftermathDateRaw = String(
      formData.get("aftermath_date") || "",
    ).trim();
    const aftermathUserNote = String(
      formData.get("aftermath_user_note") || "",
    ).trim();
    const aftermathMentorNote = String(
      formData.get("aftermath_mentor_note") || "",
    ).trim();

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

    const images = formData
      .getAll("aftermath_images")
      .filter((file) => file && typeof file === "object" && file.size > 0);

    if (images.length > 2) {
      return NextResponse.json({
        ok: false,
        message: "You can upload maximum 2 aftermath images.",
      });
    }

    const imagePaths = [];

    for (const file of images) {
      if (!file.type?.startsWith("image/")) {
        return NextResponse.json({
          ok: false,
          message: "Please upload valid image files only.",
        });
      }

      const ext = file.name?.split(".").pop() || "png";
      const path = `${user.id}/${journalId}/aftermath-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("journal-images")
        .upload(path, file, {
          contentType: file.type || "image/png",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({
          ok: false,
          message: uploadError.message,
        });
      }

      imagePaths.push(path);
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
        aftermath_images: imagePaths,
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
        aftermath_images,
        aftermath_updated_at
      `,
      )
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message });
    }

    return NextResponse.json({ ok: true, journal: data });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err?.message || "Something went wrong.",
    });
  }
}
