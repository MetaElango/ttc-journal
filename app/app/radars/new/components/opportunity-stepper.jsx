"use client";

const STEPS = [
  { id: "setup", label: "Setup", step: 1 },
  { id: "levels", label: "Trade Levels", step: 2 },
  { id: "reasoning", label: "Reasoning", step: 3 },
  { id: "images", label: "Images", step: 4 },
  { id: "risk", label: "Risk", step: 5 },
];

export default function OpportunityStepper({ activeSection }) {
  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <aside className="sticky top-24 hidden h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:block">
      <div className="space-y-7">
        {STEPS.map((item, index) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="relative flex w-full items-center gap-3 text-left"
            >
              {index !== STEPS.length - 1 ? (
                <span className="absolute left-4 top-9 h-7 border-l border-dashed border-slate-300" />
              ) : null}
              <span className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                active ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300 bg-white text-slate-500"
              }`}>
                {item.step}
              </span>
              <span className={`text-sm font-semibold ${active ? "text-sky-600" : "text-slate-700"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
