import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Stethoscope, Copy, Share2, Ban, Loader2, FileText, Check } from "lucide-react";
import { useRequireCompleteProfile } from "@/lib/use-session";
import { useProfileQuery, useDocumentsQuery } from "@/lib/use-helth-data";
import {
  createDoctorShare,
  listDoctorShares,
  revokeDoctorShare,
  type DoctorShareSummary,
} from "@/lib/doctor-share.functions";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor-share")({
  head: () => ({
    meta: [
      { title: "Doctor Sharing — Helth" },
      {
        name: "description",
        content: "Share only what a doctor needs to see, on a link that expires automatically.",
      },
    ],
  }),
  component: DoctorSharePage,
});

const EXPIRY_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
];

function shareUrl(id: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/doctor/${id}`;
}

function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `Expires in ${hours}h`;
  return `Expires in ${Math.round(hours / 24)}d`;
}

function DoctorSharePage() {
  const { session, profileQuery } = useRequireCompleteProfile();
  const docsQuery = useDocumentsQuery(session);
  const queryClient = useQueryClient();
  const profile = profileQuery.data;
  const docs = docsQuery.data ?? [];

  const sharesQuery = useQuery({
    queryKey: ["doctor-shares", session?.cardId],
    queryFn: () => listDoctorShares({ data: { cardId: session!.cardId, phone: session!.phone } }),
    enabled: !!session,
  });
  const shares = sharesQuery.data ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["doctor-shares", session?.cardId] });

  const [label, setLabel] = useState("");
  const [includeAllergies, setIncludeAllergies] = useState(true);
  const [includeMedications, setIncludeMedications] = useState(true);
  const [includeConditions, setIncludeConditions] = useState(true);
  const [includeContacts, setIncludeContacts] = useState(false);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<DoctorShareSummary | null>(null);

  const toggleDoc = (id: string) =>
    setDocumentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const create = async () => {
    if (!session) return;
    setCreating(true);
    try {
      const share = await createDoctorShare({
        data: {
          cardId: session.cardId,
          phone: session.phone,
          label,
          includeAllergies,
          includeMedications,
          includeConditions,
          includeContacts,
          documentIds,
          expiresInHours,
        },
      });
      await refresh();
      setJustCreated(share);
      setLabel("");
      setDocumentIds([]);
      toast.success("Share link created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the share link");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (id: string) => {
    await navigator.clipboard.writeText(shareUrl(id));
    toast.success("Link copied");
  };

  const shareLink = async (id: string) => {
    const url = shareUrl(id);
    if (navigator.share) {
      try {
        await navigator.share({ title: "My health information", url });
        return;
      } catch {
        // fall through to copy
      }
    }
    await copyLink(id);
  };

  const revoke = async (id: string) => {
    if (!session) return;
    try {
      await revokeDoctorShare({ data: { cardId: session.cardId, phone: session.phone, id } });
      await refresh();
      toast.success("Link revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke this link");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-16">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <Link to="/settings" aria-label="Back" className="inline-block">
          <ArrowLeft className="size-5" />
        </Link>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide opacity-60">
          <Stethoscope className="size-3.5" /> DOCTOR SHARING
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Share with a doctor</h1>
        <p className="mt-1 text-sm opacity-60">
          Pick exactly what to include. The link stops working after it expires.
        </p>
      </header>

      <main className="space-y-6 px-5 py-5">
        {justCreated && (
          <section className="rounded-2xl border border-primary/30 bg-accent p-4">
            <p className="text-sm font-bold">Link ready</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {shareUrl(justCreated.id)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void copyLink(justCreated.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-bold"
              >
                <Copy className="size-3.5" /> Copy
              </button>
              <button
                onClick={() => void shareLink(justCreated.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground"
              >
                <Share2 className="size-3.5" /> Share
              </button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-extrabold">New share</h2>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Dr. Rao — Sept visit)"
            className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
          />

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                Allergies {profile ? `(${profile.allergies.length})` : ""}
              </span>
              <Switch checked={includeAllergies} onCheckedChange={setIncludeAllergies} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                Medications {profile ? `(${profile.medications.length})` : ""}
              </span>
              <Switch checked={includeMedications} onCheckedChange={setIncludeMedications} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                Conditions {profile ? `(${profile.conditions.length})` : ""}
              </span>
              <Switch checked={includeConditions} onCheckedChange={setIncludeConditions} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Emergency contacts</span>
              <Switch checked={includeContacts} onCheckedChange={setIncludeContacts} />
            </div>
          </div>

          {docs.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-sm font-semibold">Documents</p>
              <div className="mt-2 space-y-1.5">
                {docs.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDoc(d.id)}
                    className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2 text-left"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                        documentIds.includes(d.id) ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {documentIds.includes(d.id) && (
                        <Check className="size-3 text-primary-foreground" strokeWidth={3} />
                      )}
                    </span>
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="truncate text-sm">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <p className="text-sm font-semibold">Link expires in</p>
            <div className="mt-2 flex gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.hours}
                  onClick={() => setExpiresInHours(opt.hours)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-bold ${
                    expiresInHours === opt.hours
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => void create()}
            disabled={creating}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {creating && <Loader2 className="size-4 animate-spin" />} Generate link
          </button>
        </section>

        {shares.length > 0 && (
          <section>
            <h2 className="font-extrabold">Your share links</h2>
            <div className="mt-3 space-y-2">
              {shares.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{s.label || "Doctor visit"}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.revoked ? "Revoked" : timeLeft(s.expiresAt)}
                        {s.documentCount ? ` · ${s.documentCount} document(s)` : ""}
                      </p>
                    </div>
                    {!s.revoked && (
                      <button
                        onClick={() => void revoke(s.id)}
                        aria-label="Revoke"
                        className="shrink-0 rounded-lg bg-destructive/15 p-2 text-destructive"
                      >
                        <Ban className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
