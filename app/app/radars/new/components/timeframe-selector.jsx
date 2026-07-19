"use client";

export default function TimeframeSelector({ title, values = [], selected, setSelected }) {
  const items = Array.isArray(values) ? values : [];

  function toggle(item) {
    setSelected((previous) =>
      previous.includes(item)
        ? previous.filter((value) => value !== item)
        : [...previous, item],
    );
  }

  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} <span className="text-destructive">*</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
      {selected.length === 0 ? (
        <p className="mt-3 text-xs text-destructive">Select at least one {title}.</p>
      ) : null}
    </div>
  );
}
