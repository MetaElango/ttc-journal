import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Target, BookOpen, Share2, User } from "lucide-react";
import ModeToggle from "./mode-toggle";

export default async function Navbar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const email = data?.user?.email || "";
  const initial = email ? email[0].toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link href="/app" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-lg font-bold text-background">
              T
            </div>
            <span className="text-lg font-semibold">TTC Journal</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/app/strategies"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Target size={17} />
              Strategies
            </Link>

            <Link
              href="/app/journals"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <BookOpen size={17} />
              Journals
            </Link>

            <Link
              href="/app/social"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Share2 size={17} />
              Social
            </Link>
          </nav>
        </div>

        <details className="relative">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border bg-background transition hover:bg-accent [&::-webkit-details-marker]:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              {initial}
            </span>
          </summary>

          <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border bg-background shadow-xl">
            <div className="border-b p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {initial}
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Account</p>
                  <p className="truncate text-sm font-medium">{email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between rounded-xl border p-2">
                <span className="flex items-center gap-2 text-sm">
                  <User size={16} />
                  Theme
                </span>
                <ModeToggle />
              </div>

              <form action="/logout" method="post">
                <button className="flex h-10 w-full items-center justify-center rounded-xl border text-sm font-medium hover:bg-accent">
                  Logout
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
