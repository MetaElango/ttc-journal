import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const file = formData.get("closed_evidence_image");

    if (!journalId) {
      return NextResponse.json({
        ok: false,
        message: "Journal ID is required.",
      });
    }

    if (!file || typeof file !== "object" || file.size <= 0) {
      return NextResponse.json({ ok: false, message: "Image is required." });
    }

    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({
        ok: false,
        message: "Please upload a valid image.",
      });
    }

    const ext = file.name?.split(".").pop() || "png";
    const path = `${user.id}/${journalId}/closed-evidence-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("journal-images")
      .upload(path, file, {
        contentType: file.type || "image/png",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ ok: false, message: uploadError.message });
    }

    const { data, error } = await supabase
      .from("journals")
      .update({
        closed_evidence_image: path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", journalId)
      .eq("user_id", user.id)
      .select("id, closed_evidence_image")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message });
    }

    const { data: urlData } = await supabase.storage
      .from("journal-images")
      .createSignedUrl(path, 60 * 60);

    return NextResponse.json({
      ok: true,
      journal: {
        ...data,
        closedEvidenceImageUrl: urlData?.signedUrl || "",
      },
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      message: err?.message || "Something went wrong.",
    });
  }
}
