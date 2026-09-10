import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Phone, Share2, AlertTriangle, Pill, Activity } from "lucide-react";
import { useHelth, memberByCard } from "@/lib/helth-store";
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
  const member = memberByCard(state, cardId);

  if (!member) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-bold">No card found for {cardId}</p>
          <Link to="/" className="mt-3 inline-block font-semibold text-primary">
            Go home
          </Link>
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
          <button
            aria-label="Share"
            onClick={() => toast.success("Emergency link copied")}
            className="rounded-full border border-white/20 p-2"
          >
            <Share2 className="size-4" />
          </button>
        </div>
        <p className="mt-4 text-[11px] font-semibold tracking-wide opacity-70">
          EMERGENCY HEALTH INFO
        </p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{member.name}</h1>
            <p className="text-sm opacity-60">{member.cardId}</p>
          </div>
          <p className="text-4xl leading-none font-extrabold text-primary">{member.bloodGroup}</p>
        </div>
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

        <section>
          <h2 className="text-sm font-bold">EMERGENCY Contacts</h2>
          <div className="mt-2 space-y-2">
            {member.contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3"
              >
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

        <Info icon={<AlertTriangle className="size-4 text-primary" />} title="Allergies" items={member.allergies} />
        <Info icon={<Pill className="size-4 text-primary" />} title="Medications" items={member.medications} />
        <Info icon={<Activity className="size-4 text-primary" />} title="Conditions" items={member.conditions} />

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
        {items.length ? items.join(", ") : <span className="text-muted-foreground">None reported</span>}
      </div>
    </section>
  );
}
