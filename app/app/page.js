import { createClient } from "@/lib/supabase/server";

export default async function AppPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Journal</h1>

      <p className="opacity-80">Logged in as {data?.user?.email}</p>

      <form action="/logout" method="post">
        <button type="submit" className="rounded-md border px-4 py-2">
          Logout
        </button>
      </form>
    </main>
  );
}
