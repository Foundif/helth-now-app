import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  UserRoundPlus,
  Check,
  X,
  LogOut,
  Loader2,
  Droplet,
  ScanLine,
  BellRing,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { BottomNav } from "@/components/helth/BottomNav";
import { useRequireCompleteProfile } from "@/lib/use-session";
import {
  getFamilyState,
  inviteFamilyMember,
  respondToFamilyInvite,
  leaveFamilyCircle,
  createDependentProfile,
  removeDependent,
  listFamilyAlerts,
  type FamilyAlertItem,
} from "@/lib/family.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family — Helth" },
      {
        name: "description",
        content: "Link family cards, see their key health info, and get alerted if they need help.",
      },
    ],
  }),
  component: FamilyPage,
});

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const alertMeta: Record<
  FamilyAlertItem["type"],
  { icon: React.ReactNode; label: (name: string) => string }
> = {
  scan: {
    icon: <ScanLine className="size-4 text-primary" />,
    label: (name) => `${name}'s card was scanned`,
  },
  sos: {
    icon: <AlertTriangle className="size-4 text-destructive" />,
    label: (name) => `${name} sent an SOS`,
  },
  checkin_missed: {
    icon: <BellRing className="size-4 text-destructive" />,
    label: (name) => `${name} missed a safety check-in`,
  },
};

function FamilyPage() {
  const { session } = useRequireCompleteProfile();
  const queryClient = useQueryClient();

  const familyQuery = useQuery({
    queryKey: ["family-state", session?.cardId],
    queryFn: () => getFamilyState({ data: { cardId: session!.cardId, phone: session!.phone } }),
    enabled: !!session,
  });

  const alertsQuery = useQuery({
    queryKey: ["family-alerts", familyQuery.data?.circleId],
    queryFn: () => listFamilyAlerts({ data: { cardId: session!.cardId, phone: session!.phone } }),
    enabled: !!session && !!familyQuery.data?.circleId,
    refetchInterval: 30_000,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["family-state", session?.cardId] });

  const [targetCardId, setTargetCardId] = useState("");
  const [relation, setRelation] = useState("");
  const [inviting, setInviting] = useState(false);

  const sendInvite = async () => {
    if (!session) return;
    if (!targetCardId.trim()) {
      toast.error("Enter their Helth card ID");
      return;
    }
    setInviting(true);
    try {
      await inviteFamilyMember({
        data: { cardId: session.cardId, phone: session.phone, targetCardId, relation },
      });
      await refresh();
      setTargetCardId("");
      setRelation("");
      toast.success("Invite sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the invite");
    } finally {
      setInviting(false);
    }
  };

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const respond = async (memberRowId: string, accept: boolean) => {
    if (!session) return;
    setRespondingId(memberRowId);
    try {
      await respondToFamilyInvite({
        data: { cardId: session.cardId, phone: session.phone, memberRowId, accept },
      });
      await refresh();
      toast.success(accept ? "You've joined the family circle" : "Invite declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the invite");
    } finally {
      setRespondingId(null);
    }
  };

  const [leaving, setLeaving] = useState(false);
  const leave = async () => {
    if (!session) return;
    setLeaving(true);
    try {
      await leaveFamilyCircle({ data: { cardId: session.cardId, phone: session.phone } });
      await refresh();
      toast.success("You've left the family circle");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not leave the circle");
    } finally {
      setLeaving(false);
    }
  };

  const [depName, setDepName] = useState("");
  const [depRelation, setDepRelation] = useState("");
  const [addingDependent, setAddingDependent] = useState(false);
  const addDependent = async () => {
    if (!session) return;
    if (!depName.trim()) {
      toast.error("Enter their name");
      return;
    }
    setAddingDependent(true);
    try {
      await createDependentProfile({
        data: {
          cardId: session.cardId,
          phone: session.phone,
          name: depName,
          relation: depRelation,
        },
      });
      await refresh();
      setDepName("");
      setDepRelation("");
      toast.success("Profile added — you can now edit their details and upload documents for them");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add this profile");
    } finally {
      setAddingDependent(false);
    }
  };

  const [removingId, setRemovingId] = useState<string | null>(null);
  const removeDep = async (dependentCardId: string) => {
    if (!session) return;
    setRemovingId(dependentCardId);
    try {
      await removeDependent({
        data: { cardId: session.cardId, phone: session.phone, dependentCardId },
      });
      await refresh();
      toast.success("Profile removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this profile");
    } finally {
      setRemovingId(null);
    }
  };

  const family = familyQuery.data;
  const alerts = alertsQuery.data ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-40">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide opacity-60">
          <Users className="size-3.5" /> FAMILY
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {family?.circleName ?? "Link your family"}
        </h1>
        <p className="mt-1 text-sm opacity-60">
          See their key health info and get alerted if their card is scanned or they miss a
          check-in.
        </p>
      </header>

      <main className="space-y-6 px-5 py-5">
        {familyQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {(family?.incomingInvites.length ?? 0) > 0 && (
              <section className="rounded-2xl border border-primary/30 bg-accent p-4">
                <h2 className="font-extrabold">Family requests</h2>
                <div className="mt-3 space-y-2">
                  {family!.incomingInvites.map((inv) => (
                    <div key={inv.memberRowId} className="rounded-xl bg-card px-4 py-3">
                      <p className="text-sm">
                        <span className="font-bold">{inv.fromName}</span> ({inv.fromCardId}) wants
                        to add you to <span className="font-bold">{inv.circleName}</span>
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => void respond(inv.memberRowId, true)}
                          disabled={respondingId === inv.memberRowId}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
                        >
                          <Check className="size-4" /> Accept
                        </button>
                        <button
                          onClick={() => void respond(inv.memberRowId, false)}
                          disabled={respondingId === inv.memberRowId}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-bold disabled:opacity-40"
                        >
                          <X className="size-4" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {family?.circleId ? (
              <>
                <section className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="font-extrabold">Members</h2>
                  <div className="mt-3 space-y-2">
                    {family.members.map((m) => (
                      <div
                        key={m.memberRowId}
                        className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3"
                      >
                        <Link
                          to="/card/$cardId"
                          params={{ cardId: m.cardId }}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                            {m.bloodGroup || "—"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">
                              {m.name}{" "}
                              {m.isMe && <span className="text-muted-foreground">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {m.relation || "Family"}
                              {m.managedByMe ? " · managed by you" : ""}
                              {m.status === "pending" ? " · invite pending" : ""}
                              {m.allergyCount > 0 ? ` · ${m.allergyCount} allergies` : ""}
                              {m.medicationCount > 0 ? ` · ${m.medicationCount} meds` : ""}
                            </p>
                          </div>
                        </Link>
                        {m.managedByMe ? (
                          <button
                            aria-label={`Remove ${m.name}`}
                            onClick={() => void removeDep(m.cardId)}
                            disabled={removingId === m.cardId}
                            className="shrink-0 rounded-lg bg-destructive/15 p-2 text-destructive disabled:opacity-40"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : (
                          <Droplet className="size-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="font-extrabold">Add a dependent</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    For a parent or child who doesn't have their own phone — you'll fully manage
                    their profile and documents.
                  </p>
                  <div className="mt-3 space-y-3">
                    <input
                      value={depName}
                      onChange={(e) => setDepName(e.target.value)}
                      placeholder="Their name"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    />
                    <input
                      value={depRelation}
                      onChange={(e) => setDepRelation(e.target.value)}
                      placeholder="Relation (e.g. Son, Mother)"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    />
                    <button
                      onClick={() => void addDependent()}
                      disabled={addingDependent}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
                    >
                      {addingDependent ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserRoundPlus className="size-4" />
                      )}
                      Add profile
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="font-extrabold">Invite another member</h2>
                  <div className="mt-3 space-y-3">
                    <input
                      value={targetCardId}
                      onChange={(e) => setTargetCardId(e.target.value)}
                      placeholder="Their Helth card ID (e.g. HELTH1A2B3)"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase"
                    />
                    <input
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      placeholder="Relation (e.g. Son, Wife, Father)"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    />
                    <button
                      onClick={() => void sendInvite()}
                      disabled={inviting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
                    >
                      {inviting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                      Send invite
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Find their card ID on their emergency card or ask them to share it. They'll
                      need to accept before you can see their info.
                    </p>
                  </div>
                </section>

                {alerts.length > 0 && (
                  <section className="rounded-2xl border border-border bg-card p-4">
                    <h2 className="font-extrabold">Recent alerts</h2>
                    <div className="mt-3 space-y-2">
                      {alerts.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3"
                        >
                          {alertMeta[a.type].icon}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">
                              {alertMeta[a.type].label(a.holderName)}
                            </p>
                            <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <button
                  onClick={() => void leave()}
                  disabled={leaving}
                  className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-destructive disabled:opacity-40"
                >
                  <LogOut className="size-4" /> Leave family circle
                </button>
              </>
            ) : (
              <>
                <section className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="font-extrabold">Add a dependent</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    For a parent or child who doesn't have their own phone — you'll fully manage
                    their profile and documents.
                  </p>
                  <div className="mt-3 space-y-3">
                    <input
                      value={depName}
                      onChange={(e) => setDepName(e.target.value)}
                      placeholder="Their name"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    />
                    <input
                      value={depRelation}
                      onChange={(e) => setDepRelation(e.target.value)}
                      placeholder="Relation (e.g. Son, Mother)"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    />
                    <button
                      onClick={() => void addDependent()}
                      disabled={addingDependent}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
                    >
                      {addingDependent ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserRoundPlus className="size-4" />
                      )}
                      Add profile
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="font-extrabold">Add a family member</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter their Helth card ID to invite them. Once they accept, you'll see their key
                    health info here and get alerted if their card is scanned or they miss a safety
                    check-in.
                  </p>
                  <div className="mt-3 space-y-3">
                    <input
                      value={targetCardId}
                      onChange={(e) => setTargetCardId(e.target.value)}
                      placeholder="Their Helth card ID (e.g. HELTH1A2B3)"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase"
                    />
                    <input
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      placeholder="Relation (e.g. Son, Wife, Father)"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    />
                    <button
                      onClick={() => void sendInvite()}
                      disabled={inviting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
                    >
                      {inviting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                      Send invite
                    </button>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
