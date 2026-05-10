// app/app/profile/profile-client.jsx

"use client";

import { useActionState } from "react";
import {
  BadgeCheck,
  Banknote,
  Globe2,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldShell({ label, children }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({ children, ...props }) {
  return (
    <select
      {...props}
      className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </select>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border bg-background p-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>

        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileClient({
  user,
  profile,
  tradingAccounts,
  updateProfile,
  createTradingAccount,
  deleteTradingAccount,
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

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-gradient-to-br from-card via-card to-muted/40 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Account Settings
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              {profile?.full_name || "Profile"}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Profile Details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your basic account information.
          </p>

          <form action={profileAction} className="mt-6 space-y-4">
            <FieldShell label="Full Name">
              <Input
                name="full_name"
                defaultValue={profile?.full_name || ""}
                className="h-11 rounded-xl"
                required
              />
            </FieldShell>

            <FieldShell label="Country">
              <Input
                name="country"
                defaultValue={profile?.country || ""}
                className="h-11 rounded-xl"
                required
              />
            </FieldShell>

            <FieldShell label="Experience Level">
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
              </NativeSelect>
            </FieldShell>

            {profileState.message ? (
              <p
                className={`text-sm ${
                  profileState.ok ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {profileState.message}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={profilePending}
              className="h-11 rounded-xl"
            >
              {profilePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </form>
        </section>

        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Add Trading Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the accounts you use for journaling.
          </p>

          <form action={accountAction} className="mt-6 space-y-4">
            <FieldShell label="Account Name">
              <Input
                name="account_name"
                placeholder="Eg: FTMO Challenge"
                className="h-11 rounded-xl"
                required
              />
            </FieldShell>

            <FieldShell label="Account Size">
              <NativeSelect name="account_size" required defaultValue="100000">
                <option value="" disabled>
                  Select account size
                </option>
                <option value="100000">100K</option>
                <option value="250000">250K</option>
                <option value="500000">500K</option>
              </NativeSelect>
            </FieldShell>

            <FieldShell label="Framework">
              <NativeSelect name="framework" required defaultValue="">
                <option value="" disabled>
                  Select framework
                </option>
                <option value="Prop Firm">Prop Firm</option>
                <option value="Personal">Personal</option>
                <option value="Demo">Demo</option>
                <option value="Funded">Funded</option>
              </NativeSelect>
            </FieldShell>

            <FieldShell label="Tag">
              <Input
                name="tag"
                placeholder="Eg: Main, Test, Swing"
                className="h-11 rounded-xl"
              />
            </FieldShell>

            {accountState.message ? (
              <p
                className={`text-sm ${
                  accountState.ok ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {accountState.message}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={accountPending}
              className="h-11 rounded-xl"
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
            </Button>
          </form>
        </section>
      </div>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Trading Accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Accounts available when creating journals.
        </p>

        <div className="mt-6 space-y-3">
          {tradingAccounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No trading accounts added yet.
            </div>
          ) : (
            tradingAccounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="font-semibold">{account.account_name}</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {account.framework} • ${account.account_size}
                    {account.tag ? ` • ${account.tag}` : ""}
                  </p>
                </div>

                <form action={deleteTradingAccount}>
                  <input type="hidden" name="account_id" value={account.id} />

                  <Button
                    type="submit"
                    variant="outline"
                    className="rounded-xl text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
