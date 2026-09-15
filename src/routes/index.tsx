import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Share2,
  ChevronRight,
  Pill,
  FileUp,
  UserPen,
  ScanLine,
  QrCode,
  Loader2,
} from "lucide-react";
import { HealthCard } from "@/components/helth/HealthCard";
import { BottomNav } from "@/components/helth/BottomNav";
import { profileCompletion } from "@/lib/helth-store";
import { useRequireCompleteProfile } from "@/lib/use-session";
import { useDocumentsQuery } from "@/lib/use-helth-data";
import { shareCard } from "@/lib/card-utils";
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
  const { session, profileQuery } = useRequireCompleteProfile();
  const docsQuery = useDocumentsQuery(session);
  const profile = profileQuery.data;
  const docs = docsQuery.data ?? [];

  if (!session || (profileQuery.isLoading && !profile)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-bold">Could not load your card</p>
        <button
          onClick={() => profileQuery.refetch()}
          className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  const percent = profileCompletion(profile, docs.length);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <header className="bg-ink px-5 pt-6 pb-8 text-ink-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">Hello 👋</p>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {profile.name || "Finish your profile"}
            </h1>
            <p className="text-sm opacity-60">Card active · {profile.cardId}</p>
          </div>
          <button
            aria-label="Share card"
            onClick={async () => {
              const result = await shareCard({ name: profile.name, cardId: profile.cardId });
              if (result === "copied") toast.success("Emergency link copied");
              if (result === "shared") toast.success("Emergency link shared");
            }}
            className="rounded-full border border-white/20 p-2"
          >
            <Share2 className="size-4" />
          </button>
        </div>

        <div className="mt-5">
          <HealthCard
            cardId={profile.cardId}
            name={profile.name}
            bloodGroup={profile.bloodGroup}
            contacts={profile.contacts}
          />
        </div>
      </header>

      <main className="-mt-4 space-y-6 rounded-t-3xl bg-background px-5 pt-5">
        <Link
          to="/card/$cardId"
          params={{ cardId: profile.cardId }}
          className="flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-ink-foreground"
        >
          <span className="rounded-lg bg-primary/20 p-2">
            <QrCode className="size-4 text-primary" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold">See your emergency page</span>
            <span className="block text-xs opacity-60">
              Exactly what a stranger sees after scanning
            </span>
          </span>
          <ChevronRight className="size-4 opacity-70" />
        </Link>

        <section>
          <h2 className="font-bold">Complete your profile</h2>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-success transition-all" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{percent}% done</span>
          </div>

          <div className="mt-3 space-y-2">
            <Link
              to="/profile"
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
            >
              <UserPen className="size-5 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-bold">
                  {profile.name && profile.bloodGroup
                    ? "Update your details"
                    : "Add name & blood group"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Shown to responders in an emergency
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              to="/profile"
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
            >
              <Pill className="size-5 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-bold">
                  {profile.medications.length
                    ? `${profile.medications.length} medications saved`
                    : "Add medications"}
                </span>
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
                <span className="block text-sm font-bold">
                  {docs.length ? `${docs.length} documents stored` : "Upload a health document"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Prescription, lab report, or scan
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="font-bold">Quick actions</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              to="/scan"
              className="rounded-xl border border-border bg-card px-4 py-5 text-center"
            >
              <ScanLine className="mx-auto size-6 text-primary" />
              <span className="mt-2 block text-sm font-bold">Scan a card</span>
            </Link>
            <Link
              to="/locker"
              className="rounded-xl border border-border bg-card px-4 py-5 text-center"
            >
              <FileUp className="mx-auto size-6 text-primary" />
              <span className="mt-2 block text-sm font-bold">Health Locker</span>
            </Link>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
