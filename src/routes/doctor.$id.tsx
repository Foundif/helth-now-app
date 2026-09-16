import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Pill,
  Activity,
  Phone,
  FileText,
  Loader2,
  ShieldOff,
  Clock,
} from "lucide-react";
import { getDoctorShare } from "@/lib/doctor-share.functions";

export const Route = createFileRoute("/doctor/$id")({
  head: () => ({
    meta: [
      { title: "Shared health information — Helth" },
      { name: "description", content: "Health information shared for a doctor visit." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DoctorSharePage,
});

function Info({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
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

function DoctorSharePage() {
  const { id } = useParams({ from: "/doctor/$id" });

  const shareQuery = useQuery({
    queryKey: ["doctor-share", id],
    queryFn: () => getDoctorShare({ data: { id } }),
    retry: 1,
  });

  if (shareQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const view = shareQuery.data;
  if (!view) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-center">
        <div>
          <ShieldOff className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-lg font-bold">This link isn't available</p>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have expired, been revoked, or the link is incorrect.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Go to Helth
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <p className="text-[11px] font-semibold tracking-wide opacity-70">
          SHARED HEALTH INFORMATION
        </p>
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">{view.holderName}</h1>
          <p className="text-4xl leading-none font-extrabold text-primary">{view.bloodGroup}</p>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] opacity-60">
          <Clock className="size-3" /> Shared read-only, until{" "}
          {new Date(view.expiresAt).toLocaleString()}
        </p>
      </header>

      <main className="space-y-5 px-5 py-5">
        {view.allergies && (
          <Info
            icon={<AlertTriangle className="size-4 text-primary" />}
            title="Allergies"
            items={view.allergies}
          />
        )}
        {view.medications && (
          <Info
            icon={<Pill className="size-4 text-primary" />}
            title="Medications"
            items={view.medications}
          />
        )}
        {view.conditions && (
          <Info
            icon={<Activity className="size-4 text-primary" />}
            title="Conditions"
            items={view.conditions}
          />
        )}

        {view.contacts && (
          <section>
            <h2 className="text-sm font-bold">Emergency Contacts</h2>
            <div className="mt-2 space-y-2">
              {view.contacts.length === 0 ? (
                <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  No contacts saved.
                </p>
              ) : (
                view.contacts.map((c) => (
                  <div
                    key={c.name + c.phone}
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
                ))
              )}
            </div>
          </section>
        )}

        {view.documents.length > 0 && (
          <section>
            <h2 className="text-sm font-bold">Documents</h2>
            <div className="mt-2 space-y-2">
              {view.documents.map((d) => (
                <a
                  key={d.id}
                  href={d.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3"
                >
                  <FileText className="size-5 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{d.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <p className="pb-8 text-center text-xs text-muted-foreground">
          Shared via Helth. This link only shows what the patient chose to include.
        </p>
      </main>
    </div>
  );
}
