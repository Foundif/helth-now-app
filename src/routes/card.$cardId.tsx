import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  Share2,
  AlertTriangle,
  Pill,
  Activity,
  Loader2,
  Sparkles,
  Pencil,
} from "lucide-react";
import { useHelth, memberByCard } from "@/lib/helth-store";
import { getEmergencyCard, type PublicEmergencyCard } from "@/lib/emergency-card.functions";
import { getEmergencySummary } from "@/lib/ai-summary.functions";
import { shareCard } from "@/lib/card-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/card/$cardId")({
  head: () => ({
    meta: [
      { title: "Emergency health info — Helth" },
      {
        name: "description",
        content:
          "Scan a Helth card to see blood group, allergies, medications and emergency contacts.",
      },
      { property: "og:title", content: "Emergency health info — Helth" },
      {
        property: "og:description",
        content:
          "Scan a Helth card to see blood group, allergies, medications and emergency contacts.",
      },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const { cardId } = useParams({ from: "/card/$cardId" });
  const { state } = useHelth();
  const localMember = memberByCard(state, cardId);
  const isOwner = Boolean(localMember);

  const cardQuery = useQuery({
    queryKey: ["emergency-card", cardId],
    queryFn: () => getEmergencyCard({ data: { cardId } }),
    retry: 1,
  });

  const card: PublicEmergencyCard | null =
    cardQuery.data ??
    (localMember
      ? {
          cardId: localMember.cardId,
          holderName: localMember.name,
          bloodGroup: localMember.bloodGroup,
          allergies: localMember.allergies,
          medications: localMember.medications,
          conditions: localMember.conditions,
          contacts: localMember.contacts,
          updatedAt: new Date().toISOString(),
        }
      : null);

  const summaryQuery = useQuery({
    queryKey: ["emergency-summary", card?.cardId, card?.updatedAt],
    enabled: Boolean(card),
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: () =>
      getEmergencySummary({
        data: {
          holderName: card!.holderName,
          bloodGroup: card!.bloodGroup,
          allergies: card!.allergies,
          medications: card!.medications,
          conditions: card!.conditions,
          contactCount: card!.contacts.length,
        },
      }),
  });

  if (cardQuery.isLoading && !card) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-bold">
            {cardQuery.isError ? "Could not load this card" : `No card found for ${cardId}`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {cardQuery.isError
              ? "Check the connection and try again."
              : "This card has not been set up yet."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => cardQuery.refetch()}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-ink-foreground"
            >
              Retry
            </button>
            <Link to="/" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <header className="bg-ink px-5 pt-5 pb-6 text-ink-foreground">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Link
                to="/profile"
                className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold"
              >
                <Pencil className="size-3.5" /> Edit
              </Link>
            )}
            <button
              aria-label="Share emergency link"
              onClick={async () => {
                const result = await shareCard({ name: card.holderName, cardId: card.cardId });
                if (result === "copied") toast.success("Emergency link copied");
                if (result === "shared") toast.success("Emergency link shared");
              }}
              className="rounded-full border border-white/20 p-2"
            >
              <Share2 className="size-4" />
            </button>
          </div>
        </div>
        <p className="mt-4 text-[11px] font-semibold tracking-wide opacity-70">
          EMERGENCY HEALTH INFO
        </p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{card.holderName}</h1>
            <p className="text-sm opacity-60">{card.cardId}</p>
          </div>
          <p className="text-4xl leading-none font-extrabold text-primary">{card.bloodGroup}</p>
        </div>
        {!isOwner && (
          <p className="mt-3 text-[11px] opacity-60">
            Read-only. Only the card owner's device can change these details.
          </p>
        )}
      </header>

      <main className="space-y-5 px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <a
            href="tel:108"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground"
          >
            <Phone className="size-4" /> Call 108
          </a>
          <a
            href="tel:112"
            className="flex items-center justify-center gap-2 rounded-xl bg-ink py-4 font-bold text-ink-foreground"
          >
            <Phone className="size-4" /> Call 112
          </a>
        </div>

        <section className="rounded-xl border border-primary/25 bg-accent px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
            <Sparkles className="size-4" /> AI emergency summary
          </h2>
          {summaryQuery.isLoading ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Preparing briefing…
            </p>
          ) : summaryQuery.data?.summary ? (
            <p className="mt-2 text-sm leading-relaxed">{summaryQuery.data.summary}</p>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">
              {summaryQuery.data?.error ?? "Summary unavailable."}
              <button
                onClick={() => summaryQuery.refetch()}
                className="ml-2 font-semibold text-primary"
              >
                Retry
              </button>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold">EMERGENCY Contacts</h2>
          <div className="mt-2 space-y-2">
            {card.contacts.length === 0 && (
              <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                No contacts saved.
              </p>
            )}
            {card.contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
                <span className="flex-1">
                  <span className="block text-sm font-bold">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{c.phone}</span>
                </span>
                <a
                  href={`tel:${c.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-xs font-bold"
                >
                  <Phone className="size-3.5" /> CALL
                </a>
              </div>
            ))}
          </div>
        </section>

        <Info
          icon={<AlertTriangle className="size-4 text-primary" />}
          title="Allergies"
          items={card.allergies}
        />
        <Info
          icon={<Pill className="size-4 text-primary" />}
          title="Medications"
          items={card.medications}
        />
        <Info
          icon={<Activity className="size-4 text-primary" />}
          title="Conditions"
          items={card.conditions}
        />

        <p className="pb-8 text-center text-xs text-muted-foreground">
          Shown to anyone who scans this card in an emergency.
        </p>
      </main>
    </div>
  );
}

function Info({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-bold">
        {icon} {title}
      </h2>
      <div className="mt-2 rounded-xl bg-muted px-4 py-3 text-sm">
        {items.length ? (
          items.join(", ")
        ) : (
          <span className="text-muted-foreground">None reported</span>
        )}
      </div>
    </section>
  );
}
