import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IdCard,
  UserPen,
  Share2,
  ChevronRight,
  ShieldCheck,
  BellRing,
  Loader2,
  Stethoscope,
  Siren,
} from "lucide-react";
import { BottomNav } from "@/components/helth/BottomNav";
import { useRequireCompleteProfile } from "@/lib/use-session";
import { deleteAccount } from "@/lib/helth.functions";
import { getCheckinSettings, setCheckinSettings } from "@/lib/checkin.functions";
import { shareCard } from "@/lib/card-utils";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Helth" },
      {
        name: "description",
        content: "Manage your Helth card, profile details and account.",
      },
      { property: "og:title", content: "Settings — Helth" },
      {
        property: "og:description",
        content: "Manage your Helth card, profile details and account.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, update, profileQuery } = useRequireCompleteProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const profile = profileQuery.data;
  const firstName = (profile?.name || "Your profile").split(" ")[0] ?? "Your profile";

  const checkinQuery = useQuery({
    queryKey: ["checkin-settings", session?.cardId],
    queryFn: () => getCheckinSettings({ data: { cardId: session!.cardId, phone: session!.phone } }),
    enabled: !!session,
  });
  const [intervalDraft, setIntervalDraft] = useState(30);
  const [savingCheckin, setSavingCheckin] = useState(false);

  useEffect(() => {
    if (checkinQuery.data) setIntervalDraft(checkinQuery.data.intervalMinutes);
  }, [checkinQuery.data]);

  const applyCheckinSettings = async (enabled: boolean, intervalMinutes: number) => {
    if (!session) return;
    setSavingCheckin(true);
    try {
      await setCheckinSettings({
        data: { cardId: session.cardId, phone: session.phone, enabled, intervalMinutes },
      });
      await queryClient.invalidateQueries({ queryKey: ["checkin-settings", session.cardId] });
      toast.success(enabled ? "Safety check-in enabled" : "Safety check-in turned off");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update check-in settings");
    } finally {
      setSavingCheckin(false);
    }
  };

  const logout = () => {
    update((s) => ({ ...s, session: null }));
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  const removeAccount = async () => {
    if (!session) return;
    if (!window.confirm("Delete your card and all documents permanently?")) return;
    setBusy(true);
    try {
      await deleteAccount({ data: { cardId: session.cardId, phone: session.phone } });
      update((s) => ({ ...s, session: null }));
      queryClient.clear();
      toast.success("Your card and documents were deleted");
      navigate({ to: "/auth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete your account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-success/25 text-xl font-extrabold ring-2 ring-success">
            {firstName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-bold">{profile?.name || "Finish your profile"}</p>
            <p className="text-sm opacity-60">{session?.cardId ?? ""}</p>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-5 py-5">
        <section>
          <p className="mb-2 text-sm font-bold text-muted-foreground">Card</p>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            <Link to="/card/$cardId" params={{ cardId: session?.cardId ?? "" }} className="block">
              <Row
                icon={<IdCard className="size-5 text-primary" />}
                title="View emergency page"
                sub="What a responder sees when they scan"
              />
            </Link>
            <Row
              icon={<Share2 className="size-5 text-primary" />}
              title="Share your card link"
              sub="Send it to family or your doctor"
              onClick={async () => {
                if (!session) return;
                const result = await shareCard({
                  name: profile?.name ?? "",
                  cardId: session.cardId,
                });
                if (result === "copied") toast.success("Emergency link copied");
                if (result === "shared") toast.success("Emergency link shared");
              }}
            />
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-bold text-muted-foreground">Profile</p>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Link to="/profile" className="block">
              <Row
                icon={<UserPen className="size-5 text-primary" />}
                title="Edit Profile"
                sub="Update your medical details"
              />
            </Link>
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-bold text-muted-foreground">Healthcare</p>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Link to="/doctor-share" className="block border-b border-border">
              <Row
                icon={<Stethoscope className="size-5 text-primary" />}
                title="Share with Doctor"
                sub="Time-limited link with only what you pick"
              />
            </Link>
            <Link to="/hospitals" className="block">
              <Row
                icon={<Siren className="size-5 text-primary" />}
                title="Hospitals & Ambulance"
                sub="Saved hospitals and one-tap emergency calls"
              />
            </Link>
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-bold text-muted-foreground">Privacy</p>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Row
              icon={<ShieldCheck className="size-5 text-primary" />}
              title="What others can see"
              sub="Name, blood group, allergies, medicines and contacts only"
              onClick={() =>
                toast("Your phone number and documents are never shown to anyone who scans")
              }
            />
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-bold text-muted-foreground">Safety check-in</p>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-muted p-2">
                <BellRing className="size-5 text-primary" />
              </span>
              <span className="flex-1">
                <span className="block font-bold">Periodic "are you safe?" check</span>
                <span className="block text-sm text-muted-foreground">
                  If you don't respond, an alarm plays and your family is alerted
                </span>
              </span>
              <Switch
                checked={checkinQuery.data?.enabled ?? false}
                disabled={savingCheckin || checkinQuery.isLoading}
                onCheckedChange={(checked) => void applyCheckinSettings(checked, intervalDraft)}
              />
            </div>

            {checkinQuery.data?.enabled && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-semibold">Check in every</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={720}
                    value={intervalDraft}
                    onChange={(e) => setIntervalDraft(Number(e.target.value) || 30)}
                    className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                  <button
                    onClick={() => void applyCheckinSettings(true, intervalDraft)}
                    disabled={savingCheckin || intervalDraft === checkinQuery.data.intervalMinutes}
                    className="ml-auto rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                  >
                    {savingCheckin ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Works while Helth is open on your phone. Add it to your home screen so it's easy
                  to keep open.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-3">
          <button
            onClick={logout}
            className="w-full rounded-xl border border-border bg-card py-4 font-bold text-primary"
          >
            Logout
          </button>
          <button
            onClick={() => void removeAccount()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-4 font-bold text-primary disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Delete Account
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function Row({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left"
    >
      <span className="rounded-lg bg-muted p-2">{icon}</span>
      <span className="flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </div>
  );
}
