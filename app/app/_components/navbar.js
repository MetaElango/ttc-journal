// app/app/_components/navbar.jsx

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

import {
  BarChart3,
  BookOpen,
  CircleUserRound,
  LogOut,
  Share2,
  Target,
  User,
} from "lucide-react";

import ModeToggle from "./mode-toggle";
import AccountDropdown from "./account-dropdown";

export default async function Navbar() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();

  const user = data?.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id)
    .single();

  const email = user?.email || "";

  const fullName = profile?.full_name || "";

  const initial = fullName
    ? fullName.trim()[0].toUpperCase()
    : email
      ? email[0].toUpperCase()
      : "U";

  const displayName = fullName || email || "Account";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        {/* LEFT */}
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

            <Link
              href="/app/metrics"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <BarChart3 size={17} />
              Metrics
            </Link>
          </nav>
        </div>

        {/* RIGHT */}
        <AccountDropdown
          initial={initial}
          displayName={displayName}
          email={email}
        />
      </div>
    </header>
  );
}
