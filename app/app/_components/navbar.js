// app/app/_components/navbar.jsx

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  BarChart3,
  BookOpen,
  Compass,
  Menu,
  Network,
  Target,
  TrendingUp,
} from "lucide-react";

import AccountDropdown from "./account-dropdown";

const NAV_ITEMS = [
  {
    label: "Ascend",
    href: "/app",
    icon: TrendingUp,
    description: "Growth Hub",
  },
  {
    label: "Radars",
    href: "/app/radars",
    icon: Compass,
    description: "Opportunities",
  },
  {
    label: "Playbooks",
    href: "/app/playbooks",
    icon: Target,
    description: "Strategies",
  },
  {
    label: "Journals",
    href: "/app/journals",
    icon: BookOpen,
    description: "Reflections",
  },
  {
    label: "Insights",
    href: "/app/insights",
    icon: BarChart3,
    description: "Analytics",
  },
  {
    label: "Circle",
    href: "/app/circle",
    icon: Network,
    description: "Community",
  },
];

export default async function Navbar() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const { data: profile } = user?.id
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
    : { data: null };

  const email = user?.email || "";
  const fullName = profile?.full_name || "";

  const initial = fullName
    ? fullName.trim()[0].toUpperCase()
    : email
      ? email[0].toUpperCase()
      : "U";

  const displayName = fullName || email || "Account";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-10">
          <Link href="/app" className="flex items-center">
            <img
              src="/logo.PNG"
              alt="EXCELLION TTC"
              className="h-18 w-auto object-contain md:h-18"
            />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 text-base font-semibold text-slate-600 transition hover:text-blue-700"
                >
                  <Icon className="h-5 w-5 text-slate-400" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <AccountDropdown
            initial={initial}
            displayName={displayName}
            email={email}
          />
        </div>

        <details className="relative block lg:hidden">
          <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-md">
            <Menu className="h-6 w-6" />
          </summary>

          <div className="absolute right-0 mt-3 w-[310px] overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
            <div className="mb-3 border-b border-slate-100 px-2 pb-3">
              <AccountDropdown
                initial={initial}
                displayName={displayName}
                email={email}
              />
            </div>

            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </span>

                    <span>
                      <span className="block text-sm font-bold">
                        {item.label}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
