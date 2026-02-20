import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./settings-form";

export default async function SettingsPage({ searchParams }) {
  const params = await searchParams; // 👈 IMPORTANT
  const next = params?.next || "/app";

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, country, experience_level, instagram_handle")
    .eq("id", user.id)
    .maybeSingle();

  async function saveProfile(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const full_name = String(formData.get("full_name") || "").trim();
    const country = String(formData.get("country") || "").trim();
    const experience_level = formData.get("experience_level") || null;
    const instagram_handle = String(
      formData.get("instagram_handle") || "",
    ).trim();

    // Update
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name,
        country,
        experience_level,
        instagram_handle: instagram_handle || null,
      })
      .eq("id", user.id);

    if (updateError) {
      return {
        profile: prevState.profile,
        message: updateError.message,
      };
    }

    // Fetch updated
    const { data: updated, error: readError } = await supabase
      .from("profiles")
      .select("full_name, country, experience_level, instagram_handle")
      .eq("id", user.id)
      .single();

    if (readError) {
      return { profile: prevState.profile, message: readError.message };
    }

    const complete =
      !!updated.full_name && !!updated.country && !!updated.experience_level;

    // If profile complete, allow navigation to where they wanted to go
    if (complete) {
      redirect(next);
    }

    // Otherwise stay here (but they shouldn't be able to leave anyway)
    return {
      profile: updated,
      message: "Saved.",
    };
  }

  return <SettingsForm initialProfile={profile || {}} action={saveProfile} />;
}
