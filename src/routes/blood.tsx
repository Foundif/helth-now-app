import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplet, Loader2, Phone, Plus, X, Check, Ban } from "lucide-react";
import { BottomNav } from "@/components/helth/BottomNav";
import { useRequireCompleteProfile } from "@/lib/use-session";
import { BLOOD_GROUPS } from "@/lib/helth.functions";
import {
  getDonorStatus,
  setDonorStatus,
  setDonorInactive,
  searchDonors,
  createBloodRequest,
  listBloodRequests,
  closeBloodRequest,
  type Donor,
  type BloodRequestItem,
} from "@/lib/blood.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/blood")({
  head: () => ({
    meta: [
      { title: "Blood Donor Network — Helth" },
      {
        name: "description",
        content: "Find opted-in blood donors nearby, or post an urgent blood request.",
      },
    ],
  }),
  component: BloodPage,
});

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function GroupPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BLOOD_GROUPS.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(g)}
          className={`rounded-full border px-4 py-2 text-sm font-bold ${
            g === value ? "border-primary bg-primary text-primary-foreground" : "border-border"
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

function BloodPage() {
  const { session, profileQuery } = useRequireCompleteProfile();
  const queryClient = useQueryClient();

  // --- Donor opt-in ---
  const donorQuery = useQuery({
    queryKey: ["donor-status", session?.cardId],
    queryFn: () => getDonorStatus({ data: { cardId: session!.cardId, phone: session!.phone } }),
    enabled: !!session,
  });
  const [donorForm, setDonorForm] = useState<{
    bloodGroup: string;
    city: string;
    phone: string;
  } | null>(null);
  const [savingDonor, setSavingDonor] = useState(false);

  useEffect(() => {
    if (donorForm || donorQuery.data === undefined || !session) return;
    setDonorForm({
      bloodGroup: donorQuery.data?.bloodGroup || profileQuery.data?.bloodGroup || "",
      city: donorQuery.data?.city || "",
      phone: donorQuery.data?.phone || session.phone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donorQuery.data, session]);

  const refreshDonor = () =>
    queryClient.invalidateQueries({ queryKey: ["donor-status", session?.cardId] });

  const saveDonor = async () => {
    if (!session || !donorForm) return;
    if (!donorForm.bloodGroup) {
      toast.error("Select your blood group");
      return;
    }
    if (!donorForm.city.trim()) {
      toast.error("Enter your city");
      return;
    }
    setSavingDonor(true);
    try {
      await setDonorStatus({
        data: {
          cardId: session.cardId,
          phone: session.phone,
          bloodGroup: donorForm.bloodGroup,
          city: donorForm.city,
          donorPhone: donorForm.phone,
        },
      });
      await refreshDonor();
      toast.success("You're listed as an opted-in donor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save donor details");
    } finally {
      setSavingDonor(false);
    }
  };

  const optOut = async () => {
    if (!session) return;
    setSavingDonor(true);
    try {
      await setDonorInactive({ data: { cardId: session.cardId, phone: session.phone } });
      await refreshDonor();
      toast.success("You're no longer listed as a donor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update donor status");
    } finally {
      setSavingDonor(false);
    }
  };

  // --- Search donors ---
  const [searchGroup, setSearchGroup] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Donor[] | null>(null);

  const runSearch = async () => {
    if (!session) return;
    if (!searchGroup) {
      toast.error("Select a blood group to search");
      return;
    }
    setSearching(true);
    try {
      const found = await searchDonors({
        data: {
          cardId: session.cardId,
          phone: session.phone,
          bloodGroup: searchGroup,
          city: searchCity,
        },
      });
      setResults(found);
      if (found.length === 0) toast("No opted-in donors found for that search yet");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not search donors right now");
    } finally {
      setSearching(false);
    }
  };

  // --- Urgent requests ---
  const requestsQuery = useQuery({
    queryKey: ["blood-requests", session?.cardId],
    queryFn: () => listBloodRequests({ data: { cardId: session!.cardId, phone: session!.phone } }),
    enabled: !!session,
  });
  const refreshRequests = () =>
    queryClient.invalidateQueries({ queryKey: ["blood-requests", session?.cardId] });

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqDraft, setReqDraft] = useState({ bloodGroup: "", city: "", hospital: "", notes: "" });
  const [posting, setPosting] = useState(false);

  const postRequest = async () => {
    if (!session) return;
    if (!reqDraft.bloodGroup) {
      toast.error("Select the blood group needed");
      return;
    }
    if (!reqDraft.city.trim()) {
      toast.error("Enter the city");
      return;
    }
    setPosting(true);
    try {
      await createBloodRequest({
        data: {
          cardId: session.cardId,
          phone: session.phone,
          bloodGroup: reqDraft.bloodGroup,
          city: reqDraft.city,
          hospital: reqDraft.hospital,
          notes: reqDraft.notes,
        },
      });
      await refreshRequests();
      setShowRequestForm(false);
      setReqDraft({ bloodGroup: "", city: "", hospital: "", notes: "" });
      toast.success("Request posted — visible to matching donors now");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the request");
    } finally {
      setPosting(false);
    }
  };

  const closeRequest = async (item: BloodRequestItem, status: "fulfilled" | "cancelled") => {
    if (!session) return;
    try {
      await closeBloodRequest({
        data: { cardId: session.cardId, phone: session.phone, requestId: item.id, status },
      });
      await refreshRequests();
      toast.success(status === "fulfilled" ? "Marked as fulfilled" : "Request cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the request");
    }
  };

  const requests = requestsQuery.data ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-40">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide opacity-60">
          <Droplet className="size-3.5" /> BLOOD DONOR NETWORK
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Find or offer blood, fast</h1>
        <p className="mt-1 text-sm opacity-60">
          Opted-in donors only. Your number stays private otherwise.
        </p>
      </header>

      <main className="space-y-6 px-5 py-5">
        {/* Donor opt-in */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-extrabold">Become a donor</h2>
          {donorQuery.isLoading || !donorForm ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : donorQuery.data?.active ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                Listed as{" "}
                <span className="font-bold text-foreground">{donorQuery.data.bloodGroup}</span>{" "}
                donor in <span className="font-bold text-foreground">{donorQuery.data.city}</span>.
                Visible to anyone searching that blood group.
              </p>
              <button
                onClick={() => void optOut()}
                disabled={savingDonor}
                className="w-full rounded-xl border border-border py-3 text-sm font-bold disabled:opacity-40"
              >
                {savingDonor ? "Updating…" : "Stop being listed"}
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                Opt in and your name, blood group, city and phone become visible to other Helth
                users searching for donors.
              </p>
              <GroupPicker
                value={donorForm.bloodGroup}
                onChange={(v) => setDonorForm((f) => (f ? { ...f, bloodGroup: v } : f))}
              />
              <input
                value={donorForm.city}
                onChange={(e) => setDonorForm((f) => (f ? { ...f, city: e.target.value } : f))}
                placeholder="City"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                value={donorForm.phone}
                onChange={(e) => setDonorForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                placeholder="Contact number"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <button
                onClick={() => void saveDonor()}
                disabled={savingDonor}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >
                {savingDonor && <Loader2 className="size-4 animate-spin" />} List me as a donor
              </button>
            </div>
          )}
        </section>

        {/* Search donors */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-extrabold">Find a donor</h2>
          <div className="mt-3 space-y-3">
            <GroupPicker value={searchGroup} onChange={setSearchGroup} />
            <input
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="City (optional)"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
            />
            <button
              onClick={() => void runSearch()}
              disabled={searching}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {searching && <Loader2 className="size-4 animate-spin" />} Search
            </button>
          </div>

          {results !== null && (
            <div className="mt-4 space-y-2">
              {results.map((d, i) => (
                <div
                  key={`${d.phone}-${i}`}
                  className="flex items-center justify-between rounded-xl bg-muted px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.bloodGroup} · {d.city}
                    </p>
                  </div>
                  <a
                    href={`tel:${d.phone}`}
                    className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                  >
                    <Phone className="size-3.5" /> Call
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Urgent requests */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">Urgent requests</h2>
            <button
              onClick={() => setShowRequestForm(true)}
              className="flex items-center gap-1 text-sm font-bold text-primary"
            >
              <Plus className="size-4" /> New
            </button>
          </div>

          {requestsQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No open requests right now.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl bg-muted px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">
                        {r.bloodGroup} needed · {r.city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.requesterName}
                        {r.hospital ? ` · ${r.hospital}` : ""} · {timeAgo(r.createdAt)}
                      </p>
                      {r.notes && <p className="mt-1 text-sm">{r.notes}</p>}
                    </div>
                    {r.isMine && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          aria-label="Mark fulfilled"
                          onClick={() => void closeRequest(r, "fulfilled")}
                          className="rounded-lg bg-success/15 p-1.5 text-success"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          aria-label="Cancel request"
                          onClick={() => void closeRequest(r, "cancelled")}
                          className="rounded-lg bg-destructive/15 p-1.5 text-destructive"
                        >
                          <Ban className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="mx-auto w-full max-w-md rounded-t-2xl bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">New Blood Request</h2>
              <button onClick={() => setShowRequestForm(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <GroupPicker
                value={reqDraft.bloodGroup}
                onChange={(v) => setReqDraft((d) => ({ ...d, bloodGroup: v }))}
              />
              <input
                value={reqDraft.city}
                onChange={(e) => setReqDraft((d) => ({ ...d, city: e.target.value }))}
                placeholder="City"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                value={reqDraft.hospital}
                onChange={(e) => setReqDraft((d) => ({ ...d, hospital: e.target.value }))}
                placeholder="Hospital (optional)"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <textarea
                value={reqDraft.notes}
                onChange={(e) => setReqDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Notes — units needed, urgency, contact instructions"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>

            <button
              onClick={() => void postRequest()}
              disabled={posting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
            >
              {posting && <Loader2 className="size-4 animate-spin" />} Post request
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
