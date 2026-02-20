"use client";

import { useTheme } from "next-themes";

export default function ModeToggle() {
  const { theme, setTheme } = useTheme();

  function nextTheme() {
    if (theme === "system") return "light";
    if (theme === "light") return "dark";
    return "system";
  }

  return (
    <button
      type="button"
      className="rounded-md border px-3 py-2 text-sm"
      onClick={() => setTheme(nextTheme())}
      aria-label="Toggle theme"
      title="Toggle theme"
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>
        {theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
