import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ModeToggle from "./mode-toggle";

export default async function Navbar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/app" className="font-semibold">
            TTC Journal
          </Link>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/app/strategies"
              className="text-sm opacity-80 hover:opacity-100"
            >
              Strategies
            </Link>

            <Link
              href="/app/social"
              className="text-sm opacity-80 hover:opacity-100"
            >
              Social
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">
            {data?.user?.email || ""}
          </span>

          <ModeToggle />

          <form action="/logout" method="post">
            <button className="rounded-md border px-3 py-2 text-sm">
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
