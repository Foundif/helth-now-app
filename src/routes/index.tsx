import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Bell,
  Share2,
  ChevronRight,
  ShieldCheck,
  Pill,
  FileUp,
  Users,
  CreditCard,
  MapPin,
} from "lucide-react";
import { HealthCard } from "@/components/helth/HealthCard";
import { BottomNav } from "@/components/helth/BottomNav";
import { useHelth, activeMember, profileCompletion } from "@/lib/helth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Helth — Your emergency health card" },
      {
        name: "description",
        content:
          "Blood group, allergies, medicines and emergency contacts, ready in one tap with Helth.",
      },
      { property: "og:title", content: "Helth — Your emergency health card" },
      {
        property: "og:description",
        content:
          "Blood group, allergies, medicines and emergency contacts, ready in one tap with Helth.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { state, update } = useHelth();
  const navigate = useNavigate();
  const member = activeMember(state);
  const docs = state.documents.filter((d) => d.memberId === member.id).length;
  const percent = profileCompletion(member, state.insuranceActivated, docs);

  useEffect(() => {
    if (!state.onboarded) navigate({ to: "/onboarding" });
  }, [state.onboarded, navigate]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <header className="bg-ink px-5 pt-6 pb-8 text-ink-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">Hello 👋</p>
            <h1 className="text-2xl font-extrabold tracking-tight">{member.name}</h1>
            <p className="text-sm opacity-60">Card active · {member.cardId}</p>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="size-5 opacity-80" />
            <button
              aria-label="Share card"
              onClick={() => toast.success(`Link copied: gethelth.com/${member.cardId}`)}
              className="rounded-full border border-white/20 p-2"
            >
              <Share2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex snap-x gap-3 overflow-x-auto pb-2">
          {state.members.map((m) => (
            <button
              key={m.id}
              onClick={() => update((s) => ({ ...s, activeMemberId: m.id }))}
              className="w-[85%] shrink-0 snap-center text-left"
            >
              <HealthCard member={m} />
            </button>
          ))}
        </div>
      </header>

      <main className="-mt-4 space-y-6 rounded-t-3xl bg-background px-5 pt-5">
        <Link
          to="/card/$cardId"
          params={{ cardId: member.cardId }}
          className="flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-ink-foreground"
        >
          <span className="rounded-lg bg-primary/20 p-2">
            <MapPin className="size-4 text-primary" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold">Card scanned in Mumbai</span>
            <span className="block text-xs opacity-60">Today 2:34 PM · Tap to view</span>
          </span>
          <ChevronRight className="size-4 opacity-70" />
        </Link>

        <section>
          <h2 className="font-bold">Complete your profile</h2>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-success" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{percent}% done</span>
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={() => {
                update((s) => ({ ...s, insuranceActivated: true }));
                toast.success("₹5L accident insurance activated");
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
            >
              <ShieldCheck className="size-5 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-bold">Activate ₹5L insurance</span>
                <span className="block text-xs text-muted-foreground">
                  {state.insuranceActivated ? "Active" : "Free with your card · Takes 2 min"}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>

            <Link
              to="/profile"
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
            >
              <Pill className="size-5 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-bold">Add medications</span>
                <span className="block text-xs text-muted-foreground">Critical for ER doctors</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              to="/locker"
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
            >
              <FileUp className="size-5 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-bold">Upload a health document</span>
                <span className="block text-xs text-muted-foreground">
                  Prescription, lab report, or scan
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="font-bold">Quick Actions</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              to="/profile"
              className="rounded-xl border border-border bg-card px-4 py-5 text-center"
            >
              <Users className="mx-auto size-6 text-primary" />
              <span className="mt-2 block text-sm font-bold">Family Cards</span>
            </Link>
            <Link
              to="/settings"
              className="rounded-xl border border-border bg-card px-4 py-5 text-center"
            >
              <CreditCard className="mx-auto size-6 text-primary" />
              <span className="mt-2 block text-sm font-bold">Order Physical Card</span>
            </Link>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
