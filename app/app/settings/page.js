import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./settings-form";

function formatNameForUsername(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, "");
      if (!clean) return "";
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join("-");
}

function buildUsernamePrefix(createdAt, fullName) {
  const date = new Date(createdAt);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const formattedName = formatNameForUsername(fullName);

  return `TTC-${yy}${mm}-${formattedName}`;
}

export default async function SettingsPage({ searchParams }) {
  const params = await searchParams;
  const next = params?.next || "/app";

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, country, experience_level, instagram_handle, username, created_at",
    )
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

    if (!full_name || !country || !experience_level) {
      return {
        profile: prevState.profile,
        message: "Please fill all required fields.",
      };
    }

    const { data: existingProfile, error: existingError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, country, experience_level, instagram_handle, username, created_at",
      )
      .eq("id", user.id)
      .single();

    if (existingError) {
      return {
        profile: prevState.profile,
        message: existingError.message,
      };
    }

    let username = existingProfile.username || null;

    if (!username) {
      const baseUsername = buildUsernamePrefix(
        existingProfile.created_at,
        full_name,
      );

      username = baseUsername;

      const { data: matches, error: matchError } = await supabase
        .from("profiles")
        .select("username")
        .ilike("username", `${baseUsername}%`);

      if (matchError) {
        return {
          profile: prevState.profile,
          message: matchError.message,
        };
      }

      const existingUsernames = new Set(
        (matches || []).map((row) => row.username),
      );

      if (existingUsernames.has(baseUsername)) {
        let counter = 1;
        while (true) {
          const candidate = `${baseUsername}-${String(counter).padStart(2, "0")}`;
          if (!existingUsernames.has(candidate)) {
            username = candidate;
            break;
          }
          counter++;
        }
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name,
        country,
        experience_level,
        instagram_handle: instagram_handle || null,
        username,
      })
      .eq("id", user.id);

    if (updateError) {
      return {
        profile: prevState.profile,
        message: updateError.message,
      };
    }

    /* -----------------------------
   CREATE DEFAULT TRADING ACCOUNT
------------------------------ */

    if (!existingProfile.username) {
      const { error: accountError } = await supabase
        .from("trading_accounts")
        .insert({
          user_id: user.id,
          account_name: "TTC-100K Account",
          account_size: 100000,
          framework: "",
          tag: "default",
        });

      if (accountError) {
        return {
          profile: prevState.profile,
          message: accountError.message,
        };
      }
    }

    const { data: updated, error: readError } = await supabase
      .from("profiles")
      .select(
        "full_name, country, experience_level, instagram_handle, username",
      )
      .eq("id", user.id)
      .single();

    if (readError) {
      return {
        profile: prevState.profile,
        message: readError.message,
      };
    }

    const complete =
      !!updated.full_name && !!updated.country && !!updated.experience_level;

    if (complete) {
      redirect(next);
    }

    return {
      profile: updated,
      message: "Saved.",
    };
  }

  return <SettingsForm initialProfile={profile || {}} action={saveProfile} />;
}
