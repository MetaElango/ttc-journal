"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Check,
  ChevronRight,
  ImagePlus,
  Layers,
  LineChart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function FieldShell({ label, required, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <Label className="text-sm font-medium">
          {label}{" "}
          {required ? <span className="text-destructive">*</span> : null}
        </Label>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function NativeSelect({ children, ...props }) {
  return (
    <select
      {...props}
      className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
    >
      {children}
    </select>
  );
}

function MultiSelect({
  label,
  required,
  options,
  value,
  onChange,
  icon: Icon,
}) {
  const selected = useMemo(() => new Set(value || []), [value]);

  function toggle(opt) {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange(Array.from(next));
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon ? (
            <div className="rounded-xl border bg-background p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : null}

          <div>
            <Label>
              {label}{" "}
              {required ? <span className="text-destructive">*</span> : null}
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select all that apply
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {(value || []).length} selected
        </div>
      </div>

      {(value || []).length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="cursor-pointer rounded-full px-2.5 py-1"
              onClick={() => toggle(v)}
            >
              {v}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.has(opt);

          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
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

function StepHeader({ icon: Icon, eyebrow, title, description }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-sm">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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

  const isEdit = mode === "edit";

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
      setImageError(
        `Maximum 5 images allowed. You already have ${existingCount} existing image${
          existingCount === 1 ? "" : "s"
        }.`,
      );
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
        router.push(state.redirectTo || "/app/strategies");
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
            ...(state.existingStrategyImages ||
              existingStrategyImages.map((x) => x.path)),
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

      router.push(state.redirectTo || "/app/strategies");
    }

    uploadImagesAndRedirect();
  }, [state, strategyImages, router, supabase, isEdit, existingStrategyImages]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-muted/40 shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Strategy Builder
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                {isEdit ? "Edit Strategy" : "Create Strategy"}
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Define your setup, timeframe stack, rules, and risk plan in one
                clean trading blueprint.
              </p>
            </div>

            <div className="rounded-2xl border bg-background p-4 text-sm shadow-sm">
              <div className="text-xs text-muted-foreground">Mode</div>
              <div className="mt-1 font-medium">
                {isEdit ? "Updating existing strategy" : "New strategy"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-6">
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

        <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
          <StepHeader
            icon={Target}
            eyebrow="Step 1"
            title="Strategy Identity"
            description="Name the playbook and classify the type of setup."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldShell label="Strategy Name" required>
                <Input
                  name="strategy_name"
                  placeholder="Eg: ORB + Trend"
                  defaultValue={strategy?.strategy_name || ""}
                  required
                  className="h-11 rounded-xl"
                />
              </FieldShell>
            </div>

            <FieldShell label="Strategy Type" required>
              <NativeSelect
                name="strategy_type"
                required
                defaultValue={strategy?.strategy_type || ""}
              >
                <option value="" disabled>
                  Select strategy type
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
        </section>

        <section className="grid gap-4">
          <MultiSelect
            label="Bias & Confluence"
            required
            options={BIAS}
            value={bias}
            onChange={setBias}
            icon={Layers}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <MultiSelect
              label="HTF"
              required
              options={TF}
              value={htf}
              onChange={setHtf}
              icon={LineChart}
            />

            <MultiSelect
              label="Intermediate TF"
              required={false}
              options={TF}
              value={itf}
              onChange={setItf}
              icon={LineChart}
            />

            <MultiSelect
              label="Entry TF"
              required
              options={TF}
              value={etf}
              onChange={setEtf}
              icon={LineChart}
            />
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
          <StepHeader
            icon={ShieldCheck}
            eyebrow="Step 2"
            title="Risk & Status"
            description="Set the risk model and decide whether this strategy is ready to use."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FieldShell label="Risk Per Trade" required hint="Example: 2">
              <Input
                name="risk_per_trade"
                type="number"
                step="0.01"
                min="0"
                placeholder="2"
                defaultValue={strategy?.risk_per_trade || ""}
                required
                className="h-11 rounded-xl"
              />
            </FieldShell>

            <FieldShell label="AVG Planned R:R" required hint="Format: 1:2">
              <Input
                name="avg_planned_rr"
                placeholder="1:2"
                defaultValue={strategy?.avg_planned_rr || ""}
                required
                className="h-11 rounded-xl"
              />
            </FieldShell>

            <FieldShell label="Planned R/Year" required>
              <Input
                name="planned_r_year"
                placeholder="20"
                inputMode="numeric"
                defaultValue={strategy?.planned_r_year || ""}
                required
                className="h-11 rounded-xl"
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
                <Label>
                  Strategy Status <span className="text-destructive">*</span>
                </Label>

                <div className="grid gap-3 sm:grid-cols-3">
                  {STRAT_STATUS.map((x) => (
                    <label
                      key={x}
                      className="flex cursor-pointer items-center justify-between rounded-2xl border bg-background p-4 text-sm transition hover:bg-accent"
                    >
                      <span>{x}</span>
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
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
          <StepHeader
            icon={ChevronRight}
            eyebrow="Step 3"
            title="Execution Rules"
            description="Write clear rules so your journal entries stay consistent."
          />

          <div className="mt-6 grid gap-4">
            <FieldShell label="Checklist" required>
              <Textarea
                name="checklist"
                rows={4}
                defaultValue={strategy?.checklist || ""}
                required
                className="rounded-xl"
                placeholder="What must be true before considering this setup?"
              />
            </FieldShell>

            <FieldShell label="Entry Rules" required>
              <Textarea
                name="entry_rules"
                rows={4}
                defaultValue={strategy?.entry_rules || ""}
                required
                className="rounded-xl"
                placeholder="When exactly do you enter?"
              />
            </FieldShell>

            <FieldShell label="Exit Rules" required>
              <Textarea
                name="exit_rules"
                rows={4}
                defaultValue={strategy?.exit_rules || ""}
                required
                className="rounded-xl"
                placeholder="When do you take profit or exit early?"
              />
            </FieldShell>

            <FieldShell label="SL Management Rules" required>
              <Textarea
                name="sl_management_rules"
                rows={4}
                defaultValue={strategy?.sl_management_rules || ""}
                required
                className="rounded-xl"
                placeholder="How do you manage stop loss after entry?"
              />
            </FieldShell>
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
          <StepHeader
            icon={ImagePlus}
            eyebrow="Optional"
            title="Strategy Images"
            description="Upload charts, marked-up examples, or setup references."
          />

          <div className="mt-6 space-y-4">
            {isEdit && existingStrategyImages.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  Existing Images ({existingStrategyImages.length})
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {existingStrategyImages.map((img, index) => (
                    <div
                      key={img.path}
                      className="relative overflow-hidden rounded-2xl border bg-muted"
                    >
                      {img.url ? (
                        <img
                          src={img.url}
                          alt={`Strategy image ${index + 1}`}
                          className="h-36 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                          Image URL missing
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setExistingStrategyImages((prev) =>
                            prev.filter((x) => x.path !== img.path),
                          );
                          setImageError("");
                        }}
                        className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white hover:bg-black"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed bg-muted/30 p-8 text-center transition hover:bg-muted/50">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="mt-3 text-sm font-medium">
                Upload strategy images
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
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

            {imageError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {imageError}
              </div>
            ) : null}

            {selectedImagePreviews.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  Selected Images ({selectedImagePreviews.length})
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {selectedImagePreviews.map((img, index) => (
                    <div
                      key={`${img.file.name}-${index}`}
                      className="relative overflow-hidden rounded-2xl border bg-muted"
                    >
                      <img
                        src={img.url}
                        alt={`Selected image ${index + 1}`}
                        className="h-36 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setStrategyImages((prev) =>
                            prev.filter((_, i) => i !== index),
                          );
                          setImageError("");
                        }}
                        className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white hover:bg-black"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="absolute bottom-2 left-2 max-w-[85%] truncate rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                        {img.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {state?.message && !state?.ok ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {state.message}
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 rounded-3xl border bg-background/85 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-sm text-muted-foreground md:block">
              Save this blueprint and use it to create journals.
            </p>

            <Button
              type="submit"
              disabled={pending || uploadingImages}
              className="h-11 rounded-2xl px-5"
            >
              {pending || uploadingImages ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Strategy"
              ) : (
                "Create Strategy"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
