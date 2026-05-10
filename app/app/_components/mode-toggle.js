"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export default function ModeToggle() {
  const { theme, setTheme } = useTheme();

  function nextTheme() {
    if (theme === "system") return "light";
    if (theme === "light") return "dark";
    return "system";
  }

  const current =
    theme === "system" ? "system" : theme === "dark" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme())}
      aria-label="Toggle theme"
      title="Toggle theme"
      suppressHydrationWarning
      className="
        group relative flex h-10 items-center gap-2 overflow-hidden
        rounded-xl border bg-background px-3 transition-all
        hover:bg-accent
      "
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        <Sun
          className={`absolute h-4 w-4 transition-all duration-300 ${
            current === "light"
              ? "scale-100 rotate-0 opacity-100"
              : "scale-0 rotate-90 opacity-0"
          }`}
        />

        <Moon
          className={`absolute h-4 w-4 transition-all duration-300 ${
            current === "dark"
              ? "scale-100 rotate-0 opacity-100"
              : "scale-0 -rotate-90 opacity-0"
          }`}
        />

        <Monitor
          className={`absolute h-4 w-4 transition-all duration-300 ${
            current === "system"
              ? "scale-100 rotate-0 opacity-100"
              : "scale-0 rotate-90 opacity-0"
          }`}
        />
      </div>

      <span className="text-sm font-medium capitalize">{current}</span>

      <div
        className="
          absolute inset-0 rounded-xl opacity-0 blur-xl transition-opacity
          group-hover:opacity-20
          bg-primary
        "
      />
    </button>
  );
}
