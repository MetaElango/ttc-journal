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
    <main className="relative min-h-screen overflow-hidden bg-[#02040b] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/excellion-hero.jpeg')" }}
      />

      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,140,255,0.10),transparent_42%)]" />

      <header className="relative z-20">
        <div className="mx-auto flex h-28 max-w-7xl items-center justify-between px-8">
          <Link href="/" className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_25px_rgba(0,180,255,0.25)]">
              <span className="text-2xl font-bold text-cyan-300">E</span>
            </div>

            <div>
              <div className="text-2xl font-semibold tracking-[0.22em] text-white">
                EXCELLION
              </div>

              <div className="mt-1 flex items-center gap-3">
                <span className="h-px w-12 bg-cyan-300" />
                <span className="text-xs font-semibold tracking-[0.5em] text-cyan-300">
                  TTC
                </span>
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-12 md:flex">
            {["Home", "About", "Framework", "Resources", "Community"].map(
              (item, index) => (
                <a
                  key={item}
                  href="#"
                  className={`relative text-base font-medium transition ${
                    index === 0
                      ? "text-cyan-300"
                      : "text-white/85 hover:text-cyan-300"
                  }`}
                >
                  {item}
                  {index === 0 ? (
                    <span className="absolute -bottom-5 left-1/2 h-[2px] w-16 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(0,180,255,1)]" />
                  ) : null}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-6">
            <Link
              href={isLoggedIn ? "/app" : "/login"}
              className="hidden h-14 items-center justify-center rounded-xl border border-cyan-400/50 px-9 text-base font-medium text-white hover:bg-cyan-400/10 md:inline-flex"
            >
              Sign in
            </Link>

            <Link
              href={isLoggedIn ? "/app" : "/login"}
              className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-cyan-500 px-9 text-base font-semibold text-white shadow-[0_0_35px_rgba(0,180,255,0.55)] hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-112px)] max-w-6xl flex-col items-center justify-start px-6 pt-20 pb-16 text-center md:pt-20">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-cyan-500/10" />

          <h1 className="relative text-6xl font-black uppercase tracking-[0.14em] md:text-[108px]">
            <span className="bg-gradient-to-r from-white via-white to-cyan-400 bg-clip-text text-transparent">
              EXCELLION
            </span>
          </h1>
        </div>

        <p className="mt-2 text-xl font-light tracking-wide text-white/75 md:text-[30px]">
          Forging Market Wizards Through Discipline.
        </p>

        <div className="relative mt-7 h-[2px] w-[430px] overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_rgba(0,180,255,1)]" />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-2xl font-semibold tracking-[0.12em] md:text-[34px]">
          <span className="text-cyan-300">Process.</span>
          <span className="text-blue-400">Precision.</span>
          <span className="text-orange-400">Wizardry.</span>
        </div>

        <p className="mt-7 max-w-3xl text-base leading-8 text-white/72 md:text-[21px] md:leading-[38px]">
          An ecosystem centered on disciplined execution, transparent learning,
          and collective accountability — shaping long-term market mastery.
        </p>

        <Link
          href={isLoggedIn ? "/app" : "/login"}
          className="group relative mt-12 inline-flex h-20 min-w-[420px] items-center justify-center rounded-2xl border border-cyan-300/60 bg-black/45 px-12 text-2xl font-semibold text-white shadow-[0_0_35px_rgba(0,180,255,0.45)] backdrop-blur transition hover:scale-[1.015]"
        >
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-400/10 opacity-0 transition group-hover:opacity-100" />

          <span className="relative z-10 flex items-center gap-8">
            Enter EXCELLION
            <ArrowRight
              size={34}
              className="text-cyan-300 transition group-hover:translate-x-2"
            />
          </span>
        </Link>
      </section>
    </main>
  );
}
