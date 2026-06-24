"use client";

import { useActionState, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  Camera,
  Disc3,
  Globe2,
  Instagram,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
} from "lucide-react";

function FieldShell({ label, children, required }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-950">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function inputClass() {
  return "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
}

function NativeSelect({ children, ...props }) {
  return (
    <select {...props} className={inputClass()}>
      {children}
    </select>
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
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ProfileClient({
  user,
  profile,
  tradingAccounts,
  updateProfile,
  createTradingAccount,
  deleteTradingAccount,
  toggleTradingAccountVisibility,
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfile,
    { ok: true, message: "" },
  );

  const [accountState, accountAction, accountPending] = useActionState(
    createTradingAccount,
    { ok: true, message: "" },
  );

  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [accountSizePreset, setAccountSizePreset] = useState("100000");

  const totalCapital = tradingAccounts.reduce(
    (acc, account) => acc + Number(account.account_size || 0),
    0,
  );

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
        <img
          src="/playbook-bg.png"
          alt=""
          className="absolute right-0 top-0 h-full w-[65%] object-cover opacity-80"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
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
                {profile?.full_name || "Your"}{" "}
                {/* <span className="text-sky-500">Profile</span> */}
              </h1>

              <p className="mt-2 text-sm text-slate-500">{user.email}</p>

              {profile?.username ? (
                <p className="mt-1 text-sm font-semibold text-sky-600">
                  @{profile.username}
                </p>
              ) : null}
            </div>
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
          <p className="mt-1 text-sm text-slate-500">
            Update your personal details, social handles, and profile picture.
          </p>

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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
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
                    placeholder="yourhandle"
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
                    placeholder="username#0000"
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
              className="inline-flex h-12 items-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            Add Trading Account
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add account capital and risk limits for journaling.
          </p>

          <form action={accountAction} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="Account Name" required>
                <input
                  name="account_name"
                  placeholder="Eg: FTMO Challenge"
                  className={inputClass()}
                  required
                />
              </FieldShell>

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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="Account Size" required>
                <NativeSelect
                  name="account_size_preset"
                  required
                  value={accountSizePreset}
                  onChange={(e) => setAccountSizePreset(e.target.value)}
                >
                  <option value="10000">10K</option>
                  <option value="25000">25K</option>
                  <option value="50000">50K</option>
                  <option value="100000">100K</option>
                  <option value="200000">200K</option>
                  <option value="custom">User Define</option>
                </NativeSelect>
              </FieldShell>

              {accountSizePreset === "custom" ? (
                <FieldShell label="Custom Account Size" required>
                  <input
                    name="account_size_custom"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Eg: 150000"
                    className={inputClass()}
                    required
                  />
                </FieldShell>
              ) : (
                <FieldShell label="Tag" required>
                  <input
                    required
                    name="tag"
                    placeholder="Eg: Main, Test, Swing"
                    className={inputClass()}
                  />
                </FieldShell>
              )}
            </div>

            {accountSizePreset === "custom" ? (
              <FieldShell label="Tag" required>
                <input
                  required
                  name="tag"
                  placeholder="Eg: Main, Test, Swing"
                  className={inputClass()}
                />
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
                    placeholder="Eg: 5"
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
                    placeholder="Eg: 10"
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
                    placeholder="Eg: 1"
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
                    placeholder="Eg: 3"
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

            <button
              type="submit"
              disabled={accountPending}
              className="inline-flex h-12 items-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {accountPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </>
              )}
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Trading Accounts
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Accounts available when creating journals.
        </p>

        <div className="mt-6 grid gap-4">
          {tradingAccounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No trading accounts added yet.
            </div>
          ) : (
            tradingAccounts.map((account) => (
              <div
                key={account.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">
                      {account.account_name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {account.framework || account.account_type} •{" "}
                      {formatMoney(account.account_size)}
                      {account.tag ? ` • ${account.tag}` : ""}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <RiskMiniCard
                        label="Daily DD"
                        value={account.daily_drawdown}
                      />
                      <RiskMiniCard
                        label="Max DD"
                        value={account.max_drawdown}
                      />
                      <RiskMiniCard
                        label="Risk / Trade"
                        value={account.risk_per_trade}
                      />
                      <RiskMiniCard
                        label="Max Exposure"
                        value={account.max_risk_exposure}
                      />
                    </div>
                  </div>

                  {/* <form action={deleteTradingAccount}>
                    <input type="hidden" name="account_id" value={account.id} />

                    <button
                      type="submit"
                      className="inline-flex h-11 items-center rounded-2xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </button>
                  </form> */}
                  <form action={toggleTradingAccountVisibility}>
                    <input type="hidden" name="account_id" value={account.id} />
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
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function RiskMiniCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-bold text-slate-950">{value ?? "—"}%</div>
    </div>
  );
}
