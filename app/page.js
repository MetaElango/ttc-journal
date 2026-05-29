import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "EXCELLION",
  description: "Forging Market Wizards Through Discipline.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isLoggedIn = !!data?.user;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef7ff] text-slate-900">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/excellion-hero.jpeg')" }}
      />

      <div className="absolute inset-0 bg-white/35" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-white via-white/80 to-transparent" />

      <header className="relative z-20">
        <div className="mx-auto flex h-32 max-w-7xl items-center justify-between px-8">
          <Link href="/" className="flex items-center">
            <img
              src="/logo.PNG"
              alt="EXCELLION TTC"
              className="h-20 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href={isLoggedIn ? "/app" : "/login"}
              className="hidden h-14 items-center justify-center rounded-xl border border-blue-200 bg-white/50 px-9 text-base font-semibold text-blue-600 shadow-sm backdrop-blur hover:bg-white/80 md:inline-flex"
            >
              Sign In
            </Link>

            <Link
              href={isLoggedIn ? "/app" : "/login"}
              className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-700 px-9 text-base font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-128px)] max-w-6xl flex-col items-center justify-start px-6 pb-16 pt-15 text-center md:pt-15">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-400/20 blur-3xl" />

          <h1 className="relative text-6xl font-black uppercase tracking-[0.14em] md:text-[108px]">
            <span className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-600 bg-clip-text text-transparent">
              EXCELLION
            </span>
          </h1>
        </div>

        <p className="mt-2 text-xl font-medium tracking-wide text-slate-600 md:text-[30px]">
          Forging Market Wizards Through Discipline.
        </p>

        <div className="relative mt-7 h-[2px] w-[430px] overflow-hidden rounded-full bg-blue-100">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_25px_rgba(37,99,235,0.65)]" />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-2xl font-bold tracking-[0.12em] md:text-[34px]">
          <span className="text-slate-800">Process.</span>
          <span className="text-blue-600">Precision.</span>
          <span className="text-cyan-500">Wizardry.</span>
        </div>

        <p className="mt-7 max-w-3xl text-base leading-8 text-slate-600 md:text-[21px] md:leading-[38px]">
          An ecosystem centered on disciplined execution, transparent learning,
          and collective accountability shaping long-term market mastery.
        </p>

        <Link
          href={isLoggedIn ? "/app" : "/login"}
          className="group relative mt-8 inline-flex h-20 min-w-[420px] items-center justify-center rounded-2xl border border-white/70 bg-white/45 px-12 text-2xl font-semibold text-slate-900 shadow-[0_24px_80px_rgba(21,54,91,0.22)] backdrop-blur-2xl transition hover:scale-[1.015]"
        >
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/10 via-white/20 to-blue-600/10 opacity-0 transition group-hover:opacity-100" />

          <span className="relative z-10 flex items-center gap-">
            Enter EXCELLION
            <ArrowRight
              size={34}
              className="text-blue-600 transition group-hover:translate-x-2"
            />
          </span>
        </Link>
      </section>
    </main>
  );
}
