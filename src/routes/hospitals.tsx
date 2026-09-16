import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, MapPin, Navigation, Plus, Trash2, Loader2, Siren } from "lucide-react";
import { useRequireCompleteProfile } from "@/lib/use-session";
import {
  listHospitals,
  addHospital,
  deleteHospital,
  type Hospital,
} from "@/lib/hospitals.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/hospitals")({
  head: () => ({
    meta: [
      { title: "Hospitals & Ambulance — Helth" },
      {
        name: "description",
        content: "Call an ambulance instantly and keep your go-to hospitals one tap away.",
      },
    ],
  }),
  component: HospitalsPage,
});

function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function findNearbyHospitals() {
  if (!navigator.geolocation) {
    window.open(mapsSearchUrl("hospitals near me"), "_blank", "noopener");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      window.open(
        mapsSearchUrl(`hospitals near ${pos.coords.latitude},${pos.coords.longitude}`),
        "_blank",
        "noopener",
      );
    },
    () => window.open(mapsSearchUrl("hospitals near me"), "_blank", "noopener"),
    { timeout: 5000 },
  );
}

function HospitalsPage() {
  const { session } = useRequireCompleteProfile();
  const queryClient = useQueryClient();

  const hospitalsQuery = useQuery({
    queryKey: ["hospitals", session?.cardId],
    queryFn: () => listHospitals({ data: { cardId: session!.cardId, phone: session!.phone } }),
    enabled: !!session,
  });
  const hospitals = hospitalsQuery.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hospitals", session?.cardId] });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hospitalPhone, setHospitalPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!session) return;
    if (!name.trim()) {
      toast.error("Enter the hospital's name");
      return;
    }
    setSaving(true);
    try {
      await addHospital({
        data: {
          cardId: session.cardId,
          phone: session.phone,
          name,
          hospitalPhone,
          address,
          notes: "",
        },
      });
      await refresh();
      setOpen(false);
      setName("");
      setHospitalPhone("");
      setAddress("");
      toast.success("Hospital saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this hospital");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (h: Hospital) => {
    if (!session) return;
    try {
      await deleteHospital({ data: { cardId: session.cardId, phone: session.phone, id: h.id } });
      await refresh();
      toast.success("Removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this hospital");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-16">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <Link to="/" aria-label="Back" className="inline-block">
          <ArrowLeft className="size-5" />
        </Link>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide opacity-60">
          <Siren className="size-3.5" /> HOSPITALS &amp; AMBULANCE
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Get help fast</h1>
      </header>

      <main className="space-y-6 px-5 py-5">
        <section className="grid grid-cols-2 gap-3">
          <a
            href="tel:108"
            className="flex flex-col items-center gap-1 rounded-2xl bg-destructive py-5 text-destructive-foreground"
          >
            <Phone className="size-6" />
            <span className="text-lg font-extrabold">108</span>
            <span className="text-xs font-semibold opacity-90">Ambulance</span>
          </a>
          <a
            href="tel:112"
            className="flex flex-col items-center gap-1 rounded-2xl bg-primary py-5 text-primary-foreground"
          >
            <Phone className="size-6" />
            <span className="text-lg font-extrabold">112</span>
            <span className="text-xs font-semibold opacity-90">Emergency</span>
          </a>
        </section>

        <button
          onClick={findNearbyHospitals}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          <span className="rounded-lg bg-muted p-2">
            <Navigation className="size-5 text-primary" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-sm font-bold">Find hospitals near me</span>
            <span className="block text-xs text-muted-foreground">
              Opens Maps with your location
            </span>
          </span>
        </button>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">Your saved hospitals</h2>
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 text-sm font-bold text-primary"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>

          {hospitalsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : hospitals.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No hospitals saved yet — add the ones you'd go to in an emergency.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {hospitals.map((h) => (
                <div key={h.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{h.name}</p>
                      {h.address && (
                        <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                          <MapPin className="mt-0.5 size-3 shrink-0" /> {h.address}
                        </p>
                      )}
                    </div>
                    <button
                      aria-label={`Remove ${h.name}`}
                      onClick={() => void remove(h)}
                      className="shrink-0 rounded-lg bg-muted p-2"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {h.phone && (
                      <a
                        href={`tel:${h.phone}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground"
                      >
                        <Phone className="size-3.5" /> Call
                      </a>
                    )}
                    <a
                      href={mapsSearchUrl(h.address || h.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-bold"
                    >
                      <Navigation className="size-3.5" /> Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="mx-auto w-full max-w-md rounded-t-2xl bg-card p-5">
            <h2 className="text-lg font-extrabold">Add hospital</h2>
            <div className="mt-3 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Hospital name"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                value={hospitalPhone}
                onChange={(e) => setHospitalPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >
                {saving && <Loader2 className="size-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
