import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Profile</h1>
      <pre className="rounded-md border p-3 text-sm overflow-auto">
        {JSON.stringify(profile, null, 2)}
      </pre>
    </div>
  );
}
