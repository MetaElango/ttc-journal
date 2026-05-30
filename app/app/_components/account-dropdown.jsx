"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleUserRound, LogOut, User } from "lucide-react";
import ModeToggle from "./mode-toggle";

export default function AccountDropdown({ initial, displayName, email }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full border bg-background transition hover:bg-accent"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          {initial}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border bg-background shadow-xl">
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {initial}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {email}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3">
            <Link
              href="/app/profile"
              onClick={() => setOpen(false)}
              className="flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-sm font-medium hover:bg-accent"
            >
              <CircleUserRound size={16} />
              Profile
            </Link>

            {/* <div
              className="flex items-center justify-between rounded-xl border p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-2 text-sm">
                <User size={16} />
                Theme
              </span>
              <ModeToggle />
            </div> */}

            <form action="/logout" method="post">
              <button className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium hover:bg-accent">
                <LogOut size={16} />
                Logout
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
