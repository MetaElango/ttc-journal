"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  ImagePlus,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";

function FieldShell({ label, required, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label className="text-sm font-semibold text-slate-950">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function NativeSelect({ children, ...props }) {
  return (
    <select
      {...props}
      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
    >
      {children}
    </select>
  );
}

function Stepper({ activeSection }) {
  const steps = [
    { id: "identity", label: "Identity", step: 1 },
    { id: "execution", label: "Execution Criteria", step: 2 },
    { id: "risk", label: "Risk & Status", step: 3 },
    { id: "optional", label: "Market Evidence", step: 4 },
  ];

  function scrollToSection(id) {
    const element = document.getElementById(id);

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <aside className="sticky top-24 hidden h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:block">
      <div className="space-y-8">
        {steps.map((item, index) => {
          const active = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="relative flex w-full items-center gap-3 text-left"
            >
              {index !== steps.length - 1 ? (
                <span className="absolute left-4 top-9 h-8 border-l border-dashed border-slate-300" />
              ) : null}

              <span
                className={[
                  "z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition",
                  active
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-300 bg-white text-slate-500",
                ].join(" ")}
              >
                {item.step}
              </span>

              <span
                className={`text-sm font-semibold transition ${
                  active ? "text-sky-600" : "text-slate-700"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function StepCard({ id, step, title, description, children, footer }) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-sky-600">
          Step {step}
        </div>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="mt-7">{children}</div>

      {footer ? <div className="mt-7 flex justify-end">{footer}</div> : null}
    </section>
  );
}

function MultiSelect({ label, required, options, value, onChange }) {
  const selected = useMemo(() => new Set(value || []), [value]);

  function toggle(opt) {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange(Array.from(next));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            {label} {required ? <span className="text-red-500">*</span> : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">Select all that apply</p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {(value || []).length} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.has(opt);

          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50",
              ].join(" ")}
            >
              {active ? <Check className="h-3.5 w-3.5" /> : null}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StrategyForm({
  action,
  strategy = null,
  mode = "create",
}) {
  const router = useRouter();
  const supabase = createClient();

  const [state, formAction, pending] = useActionState(action, {
    ok: true,
    message: "",
  });

  const isEdit = mode === "edit";

  const STRATEGY_TYPE = ["Conservative", "Aggressive"];
  const TRADING_STYLE = ["Intraday", "Swing", "Positional"];
  const SETUP_TYPE = [
    "Trend Follow",
    "Reversal",
    "Retest",
    "Breakout",
    "Price Action",
    "SUPPLY / DEMAND",
    "Support & Resistance",
  ];
  const BIAS = [
    "Fundamentals",
    "Price Action",
    "Technical Indicator",
    "Sentiment",
    "NEWS",
  ];
  const TF = [
    "MN",
    "Week",
    "2D",
    "D",
    "H16",
    "H14",
    "H12",
    "H10",
    "H8",
    "H6",
    "H4",
    "H3",
    "H2",
    "H1",
    "30",
    "30M",
    "15M",
    "10M",
    "5M",
    "1M",
  ];
  const PREP_STATUS = ["Preparing", "Draft", "Active"];
  const STRAT_STATUS = ["LIVE", "ALTERNATING", "NOT USING"];

  const [bias, setBias] = useState(strategy?.bias_confluence || []);
  const [htf, setHtf] = useState(strategy?.htf || []);
  const [itf, setItf] = useState(strategy?.intermediate_tf || []);
  const [etf, setEtf] = useState(strategy?.entry_tf || []);
  const [prepStatus, setPrepStatus] = useState(
    strategy?.preparation_status || "Preparing",
  );

  const [strategyImages, setStrategyImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [activeSection, setActiveSection] = useState("identity");

  const [existingStrategyImages, setExistingStrategyImages] = useState(
    (strategy?.strategy_images || []).map((path, index) => ({
      path,
      url: strategy?.strategyImageUrls?.[index] || "",
    })),
  );

  const selectedImagePreviews = useMemo(() => {
    return strategyImages.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, [strategyImages]);

  useEffect(() => {
    return () => {
      selectedImagePreviews.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [selectedImagePreviews]);

  function handleImageChange(e) {
    const files = Array.from(e.target.files || []);
    const existingCount = existingStrategyImages.length;

    if (existingCount + files.length > 5) {
      setImageError(`Maximum 5 images allowed.`);
      e.target.value = "";
      setStrategyImages([]);
      return;
    }

    setImageError("");
    setStrategyImages(files);
  }

  useEffect(() => {
    async function uploadImagesAndRedirect() {
      if (!state?.ok || !state?.strategyId) return;

      if (strategyImages.length === 0) {
        router.push(state.redirectTo || "/app/playbooks");
        return;
      }

      setUploadingImages(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setImageError("Unauthorized.");
        setUploadingImages(false);
        return;
      }

      const uploadedPaths = [];

      for (let i = 0; i < strategyImages.length; i++) {
        const file = strategyImages[i];
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${state.strategyId}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("strategy-images")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          setImageError(uploadError.message);
          setUploadingImages(false);
          return;
        }

        uploadedPaths.push(filePath);
      }

      const finalImages = isEdit
        ? [
            ...existingStrategyImages.map((x) => x.path),
            ...uploadedPaths,
          ].slice(0, 5)
        : uploadedPaths;

      const { error: updateError } = await supabase
        .from("strategies")
        .update({ strategy_images: finalImages })
        .eq("id", state.strategyId)
        .eq("user_id", user.id);

      if (updateError) {
        setImageError(updateError.message);
        setUploadingImages(false);
        return;
      }

      router.push(state.redirectTo || "/app/playbooks");
    }

    uploadImagesAndRedirect();
  }, [state, strategyImages, router, supabase, isEdit, existingStrategyImages]);
  useEffect(() => {
    const sections = ["identity", "execution", "risk", "optional"];

    function handleScroll() {
      const scrollPosition = window.scrollY + 180;

      for (const id of sections) {
        const element = document.getElementById(id);

        if (!element) continue;

        const top = element.offsetTop;
        const height = element.offsetHeight;

        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(id);
          break;
        }
      }
    }

    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
        <img
          src="/playbook-bg.png"
          alt=""
          className="absolute right-0 top-0 h-full w-[65%] object-cover opacity-80"
        />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/app/playbooks"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Playbooks
            </Link>

            <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-950">
              {isEdit ? "Edit" : "Create"}{" "}
              <span className="text-sky-500">Playbook</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm text-slate-500">
              Define your playbook framework, criteria, and rules in one clean
              trading blueprint.
            </p>
          </div>
        </div>
      </div>

      <form action={formAction}>
        <input
          type="hidden"
          name="bias_confluence"
          value={JSON.stringify(bias)}
        />
        <input type="hidden" name="htf" value={JSON.stringify(htf)} />
        <input
          type="hidden"
          name="intermediate_tf"
          value={JSON.stringify(itf)}
        />
        <input type="hidden" name="entry_tf" value={JSON.stringify(etf)} />
        <input
          type="hidden"
          name="existing_strategy_images"
          value={JSON.stringify(existingStrategyImages.map((x) => x.path))}
        />

        <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
          <Stepper activeSection={activeSection} />
          <div className="space-y-6">
            <StepCard
              id="identity"
              step="1"
              title="Playbook Identity"
              description="Name the playbook and classify the type of setup."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldShell label="Playbook Name" required>
                    <input
                      name="strategy_name"
                      placeholder="Eg: Trend Following Playbook"
                      defaultValue={strategy?.strategy_name || ""}
                      required
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </FieldShell>
                </div>

                <FieldShell label="Playbook Type" required>
                  <NativeSelect
                    name="strategy_type"
                    required
                    defaultValue={strategy?.strategy_type || ""}
                  >
                    <option value="" disabled>
                      Select playbook type
                    </option>
                    {STRATEGY_TYPE.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </NativeSelect>
                </FieldShell>

                <FieldShell label="Trading Style" required>
                  <NativeSelect
                    name="trading_style"
                    required
                    defaultValue={strategy?.trading_style || ""}
                  >
                    <option value="" disabled>
                      Select trading style
                    </option>
                    {TRADING_STYLE.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </NativeSelect>
                </FieldShell>

                <div className="md:col-span-2">
                  <FieldShell label="Setup Type" required>
                    <NativeSelect
                      name="setup_type"
                      required
                      defaultValue={strategy?.setup_type || ""}
                    >
                      <option value="" disabled>
                        Select setup type
                      </option>
                      {SETUP_TYPE.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </NativeSelect>
                  </FieldShell>
                </div>
              </div>
            </StepCard>
            <StepCard
              step="2"
              title="Execution Criteria"
              description="Write clear rules so your journal entries stay consistent."
              id="execution"
            >
              <section className="grid gap-5 mb-5">
                <MultiSelect
                  label="Bias & Confluence"
                  required
                  options={BIAS}
                  value={bias}
                  onChange={setBias}
                />

                <div className="grid gap-5 lg:grid-cols-3">
                  <MultiSelect
                    label="HTF"
                    required
                    options={TF}
                    value={htf}
                    onChange={setHtf}
                  />

                  <MultiSelect
                    label="Intermediate TF"
                    options={TF}
                    value={itf}
                    onChange={setItf}
                  />

                  <MultiSelect
                    label="Entry TF"
                    required
                    options={TF}
                    value={etf}
                    onChange={setEtf}
                  />
                </div>
              </section>
              <div className="grid gap-5">
                <FieldShell label="Checklist" required>
                  <textarea
                    name="checklist"
                    rows={4}
                    defaultValue={strategy?.checklist || ""}
                    required
                    placeholder="What must be true before considering this setup?"
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </FieldShell>

                <FieldShell label="Entry Criteria" required>
                  <textarea
                    name="entry_rules"
                    rows={4}
                    defaultValue={strategy?.entry_rules || ""}
                    required
                    placeholder="When exactly do you enter?"
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </FieldShell>

                <FieldShell label="Exit Criteria" required>
                  <textarea
                    name="exit_rules"
                    rows={4}
                    defaultValue={strategy?.exit_rules || ""}
                    required
                    placeholder="When do you take profit or exit early?"
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </FieldShell>

                <FieldShell label="SL Management Criteria" required>
                  <textarea
                    name="sl_management_rules"
                    rows={4}
                    defaultValue={strategy?.sl_management_rules || ""}
                    required
                    placeholder="How do you manage stop loss after entry?"
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </FieldShell>
              </div>
            </StepCard>

            <StepCard
              step="3"
              title="Risk & Status"
              description="Set the risk model and decide whether this playbook is ready to use."
              id="risk"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <FieldShell
                  label="Risk Per Trade"
                  required
                  hint="Example: 1–2%"
                >
                  <input
                    name="risk_per_trade"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Eg: 1"
                    defaultValue={strategy?.risk_per_trade || ""}
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </FieldShell>

                <FieldShell label="AVG Planned R:R" required hint="Format: 1:2">
                  <input
                    name="avg_planned_rr"
                    placeholder="Eg: 1:2"
                    defaultValue={strategy?.avg_planned_rr || ""}
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </FieldShell>

                <FieldShell label="Planned R/Year" required>
                  <input
                    name="planned_r_year"
                    placeholder="Eg: 20"
                    inputMode="numeric"
                    defaultValue={strategy?.planned_r_year || ""}
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </FieldShell>

                <FieldShell label="Preparation Status" required>
                  <NativeSelect
                    name="preparation_status"
                    required
                    value={prepStatus}
                    onChange={(e) => setPrepStatus(e.target.value)}
                  >
                    {PREP_STATUS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </NativeSelect>
                </FieldShell>

                {prepStatus === "Active" ? (
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-950">
                      Strategy Status <span className="text-red-500">*</span>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {STRAT_STATUS.map((x) => (
                        <label
                          key={x}
                          className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:bg-sky-50"
                        >
                          {x}
                          <input
                            type="radio"
                            name="strategy_status"
                            value={x}
                            required
                            defaultChecked={strategy?.strategy_status === x}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input type="hidden" name="strategy_status" value="" />
                )}
              </div>
            </StepCard>

            <StepCard
              step="4"
              title="Market Evidence"
              description="Upload charts, marked-up examples, or setup references."
              id="optional"
            >
              <div className="space-y-4">
                {isEdit && existingStrategyImages.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {existingStrategyImages.map((img) => (
                      <div
                        key={img.path}
                        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                      >
                        {img.url ? (
                          <img
                            src={img.url}
                            alt="Strategy"
                            className="h-36 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                            Image URL missing
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setExistingStrategyImages((prev) =>
                              prev.filter((x) => x.path !== img.path),
                            )
                          }
                          className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-9 text-center transition hover:bg-sky-50">
                  <Upload className="h-8 w-8 text-slate-700" />
                  <div className="mt-3 text-sm font-bold text-slate-950">
                    Upload playbook images
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Maximum 5 images total
                  </div>

                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                  />
                </label>

                {selectedImagePreviews.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {selectedImagePreviews.map((img, index) => (
                      <div
                        key={`${img.file.name}-${index}`}
                        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={img.url}
                          alt="Selected"
                          className="h-36 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setStrategyImages((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {imageError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                    {imageError}
                  </div>
                ) : null}
              </div>
            </StepCard>

            {state?.message && !state?.ok ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {state.message}
              </div>
            ) : null}

            <div className="rounded-3xl border bg-background p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="hidden text-sm text-slate-600 md:flex md:items-center md:gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-500" />
                  Save this playbook and use it to find trade opportunities that
                  fit your criteria.
                </p>

                <button
                  type="submit"
                  disabled={pending || uploadingImages}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
                >
                  {pending || uploadingImages ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {isEdit ? "Update Playbook" : "Create Playbook"}
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
