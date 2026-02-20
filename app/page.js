import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient(); // 👈 await
  const { data } = await supabase.auth.getUser();

  if (data?.user) {
    redirect("/app");
  } else {
    redirect("/login");
  }
}
