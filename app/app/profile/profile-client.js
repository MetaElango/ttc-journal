"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  Camera,
  ChevronDown,
  Disc3,
  Globe2,
  Instagram,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  ShieldCheck,
  Target,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

function FieldShell({ label, children, required, optional }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-950">
        {label} {required ? <span className="text-red-500">*</span> : null}
        {optional ? (
          <span className="ml-1 text-xs font-medium text-slate-400">
            optional
          </span>
        ) : null}
      </label>

      {children}
    </div>
  );
}

function inputClass() {
  return "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
}

function sanitize2Decimals(raw) {
  const value = String(raw ?? "");
  let output = value.replace(/[^\d.]/g, "");
  const firstDot = output.indexOf(".");

  if (firstDot !== -1) {
    output =
      output.slice(0, firstDot + 1) +
      output.slice(firstDot + 1).replace(/\./g, "");

    const [whole, decimal] = output.split(".");
    output = `${whole}.${(decimal || "").slice(0, 2)}`;
  }

  return output;
}

function sanitize8Decimals(raw) {
  const value = String(raw ?? "");
  let output = value.replace(/[^\d.]/g, "");
  const firstDot = output.indexOf(".");

  if (firstDot !== -1) {
    output =
      output.slice(0, firstDot + 1) +
      output.slice(firstDot + 1).replace(/\./g, "");

    const [whole, decimal] = output.split(".");
    output = `${whole}.${(decimal || "").slice(0, 8)}`;
  }

  return output;
}

function NativeSelect({ children, className = "", ...props }) {
  return (
    <select {...props} className={`${inputClass()} ${className}`}>
      {children}
    </select>
  );
}

function TagCombobox({ name, defaultValue = "", tags = [], required }) {
  const [value, setValue] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        required={required}
        maxLength={40}
        placeholder="Eg: Main"
        className={`${inputClass()} pr-11`}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
      />

      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
        className="absolute right-3 top-3 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && tags.length ? (
        <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setValue(tag);
                setOpen(false);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-xs font-medium text-slate-400">
        Select an existing tag or type a new one.
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="text-2xl font-bold text-slate-950">{value}</div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${value}${suffix}`;
}

function formatContractSize(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(number);
}

function formatLeverage(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "—";
  }

  return `1:${number}`;
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-bold text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
}

function MiniInfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-bold text-slate-950">{value}</div>
    </div>
  );
}

function SymbolOverrideBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
      {children}
    </span>
  );
}

export default function ProfileClient({
  user,
  profile,
  tradingAccounts = [],
  symbols = [],
  accountSymbolSettings = [],
  updateProfile,
  createTradingAccount,
  toggleTradingAccountVisibility,
  saveAccountSymbolSetting,
  deleteAccountSymbolSetting,
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfile,
    {
      ok: true,
      message: "",
    },
  );

  const [accountState, accountAction, accountPending] = useActionState(
    createTradingAccount,
    {
      ok: true,
      message: "",
    },
  );

  const [symbolSettingState, symbolSettingAction, symbolSettingPending] =
    useActionState(saveAccountSymbolSetting, {
      ok: true,
      message: "",
    });

  const [editingAccount, setEditingAccount] = useState(null);
  const [accountFormKey, setAccountFormKey] = useState(0);
  const [accountTargetMode, setAccountTargetMode] = useState("PROFIT_TARGET");
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [accountSizePreset, setAccountSizePreset] = useState("100000");

  const [symbolSettingsAccount, setSymbolSettingsAccount] = useState(null);

  const [selectedSymbolId, setSelectedSymbolId] = useState("");
  const [symbolContractSize, setSymbolContractSize] = useState("");
  const [symbolLeverage, setSymbolLeverage] = useState("");
  const [editingSymbolSettingId, setEditingSymbolSettingId] = useState("");

  const existingTags = useMemo(() => {
    return Array.from(
      new Set(
        tradingAccounts
          .map((account) => String(account.tag || "").trim())
          .filter(Boolean),
      ),
    );
  }, [tradingAccounts]);

  const totalCapital = useMemo(() => {
    return tradingAccounts.reduce(
      (total, account) => total + Number(account.account_size || 0),
      0,
    );
  }, [tradingAccounts]);

  const selectedSymbol = useMemo(() => {
    return symbols.find((symbol) => symbol.id === selectedSymbolId) || null;
  }, [symbols, selectedSymbolId]);

  const selectedAccountSettings = useMemo(() => {
    if (!symbolSettingsAccount?.id) {
      return [];
    }

    return accountSymbolSettings.filter(
      (setting) => setting.trading_account_id === symbolSettingsAccount.id,
    );
  }, [accountSymbolSettings, symbolSettingsAccount?.id]);

  const selectedAccountSettingMap = useMemo(() => {
    return new Map(
      selectedAccountSettings.map((setting) => [setting.symbol_id, setting]),
    );
  }, [selectedAccountSettings]);

  const groupedSymbols = useMemo(() => {
    const grouped = new Map();

    symbols.forEach((symbol) => {
      const category = symbol.category || "OTHER";

      if (!grouped.has(category)) {
        grouped.set(category, []);
      }

      grouped.get(category).push(symbol);
    });

    return Array.from(grouped.entries()).sort(([categoryA], [categoryB]) =>
      categoryA.localeCompare(categoryB),
    );
  }, [symbols]);

  useEffect(() => {
    if (!accountState?.ok || !accountState?.message) {
      return;
    }

    if (
      accountState.message === "Trading account added." ||
      accountState.message === "Trading account updated."
    ) {
      setEditingAccount(null);
      setAccountTargetMode("PROFIT_TARGET");
      setAccountSizePreset("100000");
      setAccountFormKey((current) => current + 1);
    }
  }, [accountState?.ok, accountState?.message]);

  useEffect(() => {
    if (!symbolSettingState?.ok || !symbolSettingState?.message) {
      return;
    }

    if (
      symbolSettingState.message === "Symbol settings saved." ||
      symbolSettingState.message.includes("Master settings will be used")
    ) {
      resetSymbolForm();
    }
  }, [symbolSettingState?.ok, symbolSettingState?.message]);

  function startEditAccount(account) {
    setEditingAccount(account);
    setAccountSizePreset("custom");
    setAccountTargetMode(account.target_mode || "PROFIT_TARGET");
    setAccountFormKey((current) => current + 1);

    setTimeout(() => {
      document.getElementById("trading-account-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function cancelEditAccount() {
    setEditingAccount(null);
    setAccountTargetMode("PROFIT_TARGET");
    setAccountSizePreset("100000");
    setAccountFormKey((current) => current + 1);
  }

  function resetSymbolForm() {
    setSelectedSymbolId("");
    setSymbolContractSize("");
    setSymbolLeverage("");
    setEditingSymbolSettingId("");
  }

  function openSymbolSettings(account) {
    setSymbolSettingsAccount(account);
    resetSymbolForm();

    setTimeout(() => {
      document.getElementById("account-symbol-settings")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function closeSymbolSettings() {
    setSymbolSettingsAccount(null);
    resetSymbolForm();
  }

  function selectSymbol(symbolId) {
    setSelectedSymbolId(symbolId);

    const existingSetting = selectedAccountSettingMap.get(symbolId);

    if (existingSetting) {
      setEditingSymbolSettingId(existingSetting.id);
      setSymbolContractSize(
        existingSetting.contract_size != null
          ? String(existingSetting.contract_size)
          : "",
      );
      setSymbolLeverage(
        existingSetting.leverage != null
          ? String(existingSetting.leverage)
          : "",
      );
      return;
    }

    setEditingSymbolSettingId("");
    setSymbolContractSize("");
    setSymbolLeverage("");
  }

  function editSymbolSetting(setting) {
    setEditingSymbolSettingId(setting.id);
    setSelectedSymbolId(setting.symbol_id);
    setSymbolContractSize(
      setting.contract_size != null ? String(setting.contract_size) : "",
    );
    setSymbolLeverage(setting.leverage != null ? String(setting.leverage) : "");

    setTimeout(() => {
      document.getElementById("symbol-setting-form")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
        <img
          src="/playbook-bg.png"
          alt=""
          className="absolute right-0 top-0 h-full w-[65%] object-cover opacity-80"
        />

        <div className="relative z-10 flex items-center gap-5">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-slate-400" />
              )}
            </div>

            <div className="absolute -bottom-2 -right-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <Camera className="h-4 w-4 text-sky-600" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-600">
              <User className="h-4 w-4" />
              ACCOUNT SETTINGS
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
              {profile?.full_name || "Your"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={BadgeCheck}
          label="Experience"
          value={profile?.experience_level || "—"}
        />

        <StatCard
          icon={Globe2}
          label="Country"
          value={profile?.country || "—"}
        />

        <StatCard
          icon={Banknote}
          label="Trading Accounts"
          value={tradingAccounts.length}
        />

        <StatCard
          icon={Wallet}
          label="Total Capital"
          value={formatMoney(totalCapital)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Profile Details
          </h2>

          <form action={profileAction} className="mt-6 space-y-5">
            <input
              type="hidden"
              name="existing_avatar_url"
              value={profile?.avatar_url || ""}
            />

            <FieldShell label="Profile Picture">
              <input
                name="avatar_file"
                type="file"
                accept="image/*"
                className={inputClass()}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  setAvatarPreview(URL.createObjectURL(file));
                }}
              />
            </FieldShell>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="Full Name" required>
                <input
                  name="full_name"
                  defaultValue={profile?.full_name || ""}
                  className={inputClass()}
                  required
                />
              </FieldShell>

              <FieldShell label="Country" required>
                <input
                  name="country"
                  defaultValue={profile?.country || ""}
                  className={inputClass()}
                  required
                />
              </FieldShell>
            </div>

            <FieldShell label="Experience Level" required>
              <NativeSelect
                name="experience_level"
                defaultValue={profile?.experience_level || ""}
                required
              >
                <option value="" disabled>
                  Select experience
                </option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Professional">Professional</option>
              </NativeSelect>
            </FieldShell>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="Instagram Handle">
                <div className="relative">
                  <Instagram className="absolute left-4 top-4 h-4 w-4 text-slate-400" />

                  <input
                    name="instagram_handle"
                    defaultValue={profile?.instagram_handle || ""}
                    className={`${inputClass()} pl-11`}
                  />
                </div>
              </FieldShell>

              <FieldShell label="Discord ID / Name">
                <div className="relative">
                  <Disc3 className="absolute left-4 top-4 h-4 w-4 text-slate-400" />

                  <input
                    name="discord_handle"
                    defaultValue={profile?.discord_handle || ""}
                    className={`${inputClass()} pl-11`}
                  />
                </div>
              </FieldShell>
            </div>

            {profileState.message ? (
              <p
                className={`rounded-2xl border p-4 text-sm font-medium ${
                  profileState.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {profileState.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={profilePending}
              className="inline-flex h-12 items-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {profilePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            {editingAccount ? "Update Trading Account" : "Add Trading Account"}
          </h2>

          <form
            id="trading-account-form"
            key={accountFormKey}
            action={accountAction}
            className="mt-6 space-y-5"
          >
            <input
              type="hidden"
              name="account_id"
              value={editingAccount?.id || ""}
            />

            {editingAccount ? (
              <>
                <input
                  type="hidden"
                  name="framework"
                  value={editingAccount.framework || ""}
                />

                <input
                  type="hidden"
                  name="account_size_preset"
                  value="custom"
                />

                <input
                  type="hidden"
                  name="account_size_custom"
                  value={editingAccount.account_size || ""}
                />
              </>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="Account Name" required>
                <input
                  name="account_name"
                  defaultValue={editingAccount?.account_name || ""}
                  className={inputClass()}
                  required
                />
              </FieldShell>

              {editingAccount ? (
                <ReadOnlyField
                  label="Account Type"
                  value={editingAccount.framework}
                />
              ) : (
                <FieldShell label="Account Type" required>
                  <NativeSelect name="framework" required defaultValue="">
                    <option value="" disabled>
                      Select account type
                    </option>
                    <option value="Personal Capital">Personal Capital</option>
                    <option value="Instant Funding">Instant Funding</option>
                    <option value="Prop Firm Challenge P1">
                      Prop Firm Challenge P1
                    </option>
                    <option value="Prop Firm Challenge P2">
                      Prop Firm Challenge P2
                    </option>
                    <option value="Funded Account">Funded Account</option>
                    <option value="Demo">Demo</option>
                  </NativeSelect>
                </FieldShell>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {editingAccount ? (
                <ReadOnlyField
                  label="Account Size"
                  value={formatMoney(editingAccount.account_size)}
                />
              ) : (
                <FieldShell label="Account Size" required>
                  <NativeSelect
                    name="account_size_preset"
                    required
                    value={accountSizePreset}
                    onChange={(event) =>
                      setAccountSizePreset(event.target.value)
                    }
                  >
                    <option value="10000">10K</option>
                    <option value="25000">25K</option>
                    <option value="50000">50K</option>
                    <option value="100000">100K</option>
                    <option value="200000">200K</option>
                    <option value="custom">User Define</option>
                  </NativeSelect>
                </FieldShell>
              )}

              {!editingAccount && accountSizePreset === "custom" ? (
                <FieldShell label="Custom Account Size" required>
                  <input
                    name="account_size_custom"
                    type="number"
                    min="1"
                    step="1"
                    className={inputClass()}
                    required
                  />
                </FieldShell>
              ) : (
                <FieldShell label="Tag" required>
                  <TagCombobox
                    name="tag"
                    tags={existingTags}
                    defaultValue={editingAccount?.tag || ""}
                    required
                  />
                </FieldShell>
              )}
            </div>

            {!editingAccount && accountSizePreset === "custom" ? (
              <FieldShell label="Tag" required>
                <TagCombobox name="tag" tags={existingTags} required />
              </FieldShell>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-sky-600" />
                <h3 className="font-bold text-slate-950">Risk Rules</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Daily Drawdown %" required>
                  <input
                    name="daily_drawdown"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingAccount?.daily_drawdown ?? ""}
                    className={inputClass()}
                    required
                  />
                </FieldShell>

                <FieldShell label="Max Drawdown %" required>
                  <input
                    name="max_drawdown"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingAccount?.max_drawdown ?? ""}
                    className={inputClass()}
                    required
                  />
                </FieldShell>

                <FieldShell label="Risk Per Trade %" required>
                  <input
                    name="risk_per_trade"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingAccount?.risk_per_trade ?? ""}
                    className={inputClass()}
                    required
                  />
                </FieldShell>

                <FieldShell label="Max Risk Exposure %" required>
                  <input
                    name="max_risk_exposure"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingAccount?.max_risk_exposure ?? ""}
                    className={inputClass()}
                    required
                  />
                </FieldShell>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-sky-600" />
                <h3 className="font-bold text-slate-950">
                  Account Target Rules
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Target Type" required>
                  <NativeSelect
                    name="target_mode"
                    required
                    value={accountTargetMode}
                    onChange={(event) =>
                      setAccountTargetMode(event.target.value)
                    }
                  >
                    <option value="PROFIT_TARGET">Profit Target</option>
                    <option value="R_COLLECTION">R Collection</option>
                  </NativeSelect>
                </FieldShell>

                {accountTargetMode === "PROFIT_TARGET" ? (
                  <FieldShell label="Profit Target %" required>
                    <input
                      name="profit_target_percentage"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        editingAccount?.profit_target_percentage ?? ""
                      }
                      className={inputClass()}
                      onChange={(event) => {
                        event.target.value = sanitize2Decimals(
                          event.target.value,
                        );
                      }}
                      required
                    />
                  </FieldShell>
                ) : (
                  <FieldShell label="R Collection Target" required>
                    <input
                      name="r_collection_target"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={editingAccount?.r_collection_target ?? ""}
                      className={inputClass()}
                      onChange={(event) => {
                        event.target.value = sanitize2Decimals(
                          event.target.value,
                        );
                      }}
                      required
                    />
                  </FieldShell>
                )}

                <FieldShell label="Max No. of Open Positions" required>
                  <input
                    name="max_open_positions"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={editingAccount?.max_open_positions ?? ""}
                    className={inputClass()}
                    required
                  />
                </FieldShell>
              </div>
            </div>

            {accountState.message ? (
              <p
                className={`rounded-2xl border p-4 text-sm font-medium ${
                  accountState.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {accountState.message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {editingAccount ? (
                <button
                  type="button"
                  onClick={cancelEditAccount}
                  className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Edit
                </button>
              ) : null}

              <button
                type="submit"
                disabled={accountPending}
                className="inline-flex h-12 items-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {accountPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingAccount ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    {editingAccount ? (
                      <Pencil className="mr-2 h-4 w-4" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}

                    {editingAccount ? "Update Trading Account" : "Add Account"}
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Trading Accounts
        </h2>

        <div className="mt-6 grid gap-4">
          {tradingAccounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No trading accounts added yet.
            </div>
          ) : (
            tradingAccounts.map((account) => {
              const overrideCount = accountSymbolSettings.filter(
                (setting) => setting.trading_account_id === account.id,
              ).length;

              return (
                <div
                  key={account.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-950">
                          {account.account_name}
                        </h3>

                        {overrideCount > 0 ? (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                            {overrideCount} symbol override
                            {overrideCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {account.framework || "—"} •{" "}
                        {formatMoney(account.account_size)}
                        {account.tag ? ` • ${account.tag}` : ""}
                      </p>

                      <div className="mt-4">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Risk Rules
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <MiniInfoCard
                            label="Daily DD"
                            value={formatValue(account.daily_drawdown, "%")}
                          />

                          <MiniInfoCard
                            label="Max DD"
                            value={formatValue(account.max_drawdown, "%")}
                          />

                          <MiniInfoCard
                            label="Risk / Trade"
                            value={formatValue(account.risk_per_trade, "%")}
                          />

                          <MiniInfoCard
                            label="Max Exposure"
                            value={formatValue(account.max_risk_exposure, "%")}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Target Rules
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <MiniInfoCard
                            label="Target Type"
                            value={
                              account.target_mode === "R_COLLECTION"
                                ? "R Collection"
                                : "Profit Target"
                            }
                          />

                          <MiniInfoCard
                            label={
                              account.target_mode === "R_COLLECTION"
                                ? "R Target"
                                : "Profit Target"
                            }
                            value={
                              account.target_mode === "R_COLLECTION"
                                ? formatValue(account.r_collection_target, "R")
                                : formatValue(
                                    account.profit_target_percentage,
                                    "%",
                                  )
                            }
                          />

                          <MiniInfoCard
                            label="Max Open Positions"
                            value={formatValue(account.max_open_positions)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditAccount(account)}
                        className="inline-flex h-11 items-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openSymbolSettings(account)}
                        className="inline-flex h-11 items-center rounded-2xl border border-violet-200 bg-violet-50 px-5 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                      >
                        <Settings2 className="mr-2 h-4 w-4" />
                        Symbol Settings
                      </button>

                      <form action={toggleTradingAccountVisibility}>
                        <input
                          type="hidden"
                          name="account_id"
                          value={account.id}
                        />

                        <input
                          type="hidden"
                          name="is_hidden"
                          value={account.is_hidden ? "false" : "true"}
                        />

                        <button
                          type="submit"
                          className={`inline-flex h-11 items-center rounded-2xl border px-5 text-sm font-semibold ${
                            account.is_hidden
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {account.is_hidden
                            ? "Hidden from metrics"
                            : "Hide from metrics"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {symbolSettingsAccount ? (
        <section
          id="account-symbol-settings"
          className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                <Settings2 className="h-4 w-4" />
                ACCOUNT SYMBOL SETTINGS
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                {symbolSettingsAccount.account_name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Override the master contract size or leverage for this trading
                account.
              </p>

              <p className="mt-2 text-xs font-medium text-slate-400">
                Leave a field empty to use the value from the master symbol
                table.
              </p>
            </div>

            <button
              type="button"
              onClick={closeSymbolSettings}
              className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </button>
          </div>

          <form
            id="symbol-setting-form"
            action={symbolSettingAction}
            className="mt-6 space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5"
          >
            <input
              type="hidden"
              name="trading_account_id"
              value={symbolSettingsAccount.id}
            />

            <input
              type="hidden"
              name="setting_id"
              value={editingSymbolSettingId}
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <FieldShell label="Symbol" required>
                <NativeSelect
                  name="symbol_id"
                  value={selectedSymbolId}
                  onChange={(event) => selectSymbol(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select symbol
                  </option>

                  {groupedSymbols.map(([category, categorySymbols]) => (
                    <optgroup key={category} label={category}>
                      {categorySymbols.map((symbol) => (
                        <option key={symbol.id} value={symbol.id}>
                          {symbol.symbol_name} — {symbol.full_name || category}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </NativeSelect>
              </FieldShell>

              <FieldShell label="Contract Size" optional>
                <input
                  name="contract_size"
                  type="text"
                  inputMode="decimal"
                  value={symbolContractSize}
                  onChange={(event) =>
                    setSymbolContractSize(sanitize8Decimals(event.target.value))
                  }
                  className={inputClass()}
                  placeholder={
                    selectedSymbol?.contract_size != null
                      ? `Master: ${selectedSymbol.contract_size}`
                      : "No master value"
                  }
                />
              </FieldShell>

              <FieldShell label="Leverage" optional>
                <input
                  name="leverage"
                  type="number"
                  min="1"
                  step="1"
                  value={symbolLeverage}
                  onChange={(event) =>
                    setSymbolLeverage(event.target.value.replace(/[^\d]/g, ""))
                  }
                  className={inputClass()}
                  placeholder={
                    selectedSymbol?.leverage
                      ? `Master: 1:${selectedSymbol.leverage}`
                      : "No master value"
                  }
                />
              </FieldShell>
            </div>

            {selectedSymbol ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-950">
                      {selectedSymbol.symbol_name}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {selectedSymbol.full_name ||
                        selectedSymbol.category ||
                        "—"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                      Master Contract:{" "}
                      {formatContractSize(selectedSymbol.contract_size)}
                    </span>

                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                      Master Leverage: {formatLeverage(selectedSymbol.leverage)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MiniInfoCard
                    label="Effective Contract Size"
                    value={formatContractSize(
                      symbolContractSize || selectedSymbol.contract_size,
                    )}
                  />

                  <MiniInfoCard
                    label="Effective Leverage"
                    value={formatLeverage(
                      symbolLeverage || selectedSymbol.leverage,
                    )}
                  />
                </div>
              </div>
            ) : null}

            {symbolSettingState.message ? (
              <p
                className={`rounded-2xl border p-4 text-sm font-medium ${
                  symbolSettingState.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {symbolSettingState.message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={symbolSettingPending || !selectedSymbolId}
                className="inline-flex h-12 items-center rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {symbolSettingPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Settings2 className="mr-2 h-4 w-4" />
                    {editingSymbolSettingId
                      ? "Update Symbol Settings"
                      : "Save Symbol Settings"}
                  </>
                )}
              </button>

              {selectedSymbolId ? (
                <button
                  type="button"
                  onClick={resetSymbolForm}
                  className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Saved Overrides
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Only symbols with account-specific values appear here.
                </p>
              </div>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {selectedAccountSettings.length} saved
              </span>
            </div>

            <div className="grid gap-3">
              {selectedAccountSettings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  This account currently uses master settings for every symbol.
                </div>
              ) : (
                selectedAccountSettings.map((setting) => {
                  const symbol =
                    setting.symbols ||
                    symbols.find((item) => item.id === setting.symbol_id);

                  const effectiveContractSize =
                    setting.contract_size ?? symbol?.contract_size ?? null;

                  const effectiveLeverage =
                    setting.leverage ?? symbol?.leverage ?? null;

                  return (
                    <div
                      key={setting.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="font-bold text-slate-950">
                            {symbol?.symbol_name || "Unknown symbol"}
                          </div>

                          <div className="mt-1 text-sm text-slate-500">
                            {symbol?.full_name || symbol?.category || "—"}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {setting.contract_size != null ? (
                              <SymbolOverrideBadge>
                                Contract override:{" "}
                                {formatContractSize(setting.contract_size)}
                              </SymbolOverrideBadge>
                            ) : null}

                            {setting.leverage != null ? (
                              <SymbolOverrideBadge>
                                Leverage override:{" "}
                                {formatLeverage(setting.leverage)}
                              </SymbolOverrideBadge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="grid min-w-[280px] grid-cols-2 gap-3">
                            <MiniInfoCard
                              label="Effective Contract"
                              value={formatContractSize(effectiveContractSize)}
                            />

                            <MiniInfoCard
                              label="Effective Leverage"
                              value={formatLeverage(effectiveLeverage)}
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => editSymbolSetting(setting)}
                              className="inline-flex h-11 items-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </button>

                            <form action={deleteAccountSymbolSetting}>
                              <input
                                type="hidden"
                                name="setting_id"
                                value={setting.id}
                              />

                              <button
                                type="submit"
                                className="inline-flex h-11 items-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
