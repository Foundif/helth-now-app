import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X, Plus, Loader2 } from "lucide-react";
import { uid } from "@/lib/helth-store";
import { useRequireSession } from "@/lib/use-session";
import { useProfileQuery } from "@/lib/use-helth-data";
import { saveMyProfile, type Contact } from "@/lib/helth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Edit profile — Helth" },
      {
        name: "description",
        content: "Update blood group, allergies, medications and emergency contacts in Helth.",
      },
      { property: "og:title", content: "Edit profile — Helth" },
      {
        property: "og:description",
        content: "Update blood group, allergies, medications and emergency contacts in Helth.",
      },
    ],
  }),
  component: ProfilePage,
});

const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

type Draft = {
  name: string;
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  contacts: Contact[];
};

function ProfilePage() {
  const { session } = useRequireSession();
  const profileQuery = useProfileQuery(session);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = profileQuery.data;
    if (p && !draft) {
      setDraft({
        name: p.name,
        bloodGroup: p.bloodGroup,
        allergies: p.allergies,
        medications: p.medications,
        conditions: p.conditions,
        contacts: p.contacts,
      });
    }
  }, [profileQuery.data, draft]);

  if (!session || !draft) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const patch = (fn: (d: Draft) => Draft) => setDraft((d) => (d ? fn(d) : d));

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Add your full name first");
      return;
    }
    if (!draft.bloodGroup) {
      toast.error("Select your blood group");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveMyProfile({
        data: { cardId: session.cardId, phone: session.phone, ...draft },
      });
      queryClient.setQueryData(["profile", session.cardId], saved);
      void queryClient.invalidateQueries({ queryKey: ["emergency-card", session.cardId] });
      toast.success("Your emergency page is updated");
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <header className="flex items-center gap-3 bg-ink px-5 py-5 text-ink-foreground">
        <Link to="/" aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-extrabold">Edit Profile</h1>
        <span className="ml-auto text-xs opacity-60">{session.cardId}</span>
      </header>

      <main className="space-y-6 px-5 py-5">
        <div>
          <label className="text-sm font-bold" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            value={draft.name}
            onChange={(e) => patch((d) => ({ ...d, name: e.target.value }))}
            placeholder="Your full name"
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3"
          />
        </div>

        <div>
          <p className="text-sm font-bold">Blood group</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {bloodGroups.map((b) => (
              <button
                key={b}
                onClick={() => patch((d) => ({ ...d, bloodGroup: b }))}
                className={`rounded-xl border py-3 font-bold ${
                  b === draft.bloodGroup
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <ChipList
          label="Allergies"
          items={draft.allergies}
          onAdd={(v) => patch((d) => ({ ...d, allergies: [...d.allergies, v] }))}
          onRemove={(i) =>
            patch((d) => ({ ...d, allergies: d.allergies.filter((_, x) => x !== i) }))
          }
        />
        <ChipList
          label="Medications"
          items={draft.medications}
          onAdd={(v) => patch((d) => ({ ...d, medications: [...d.medications, v] }))}
          onRemove={(i) =>
            patch((d) => ({ ...d, medications: d.medications.filter((_, x) => x !== i) }))
          }
        />
        <ChipList
          label="Conditions"
          items={draft.conditions}
          onAdd={(v) => patch((d) => ({ ...d, conditions: [...d.conditions, v] }))}
          onRemove={(i) =>
            patch((d) => ({ ...d, conditions: d.conditions.filter((_, x) => x !== i) }))
          }
        />

        <section>
          <p className="text-sm font-bold">Emergency contacts</p>
          <div className="mt-2 space-y-3">
            {draft.contacts.map((c, index) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={c.name}
                    placeholder="Name"
                    onChange={(e) =>
                      patch((d) => ({
                        ...d,
                        contacts: d.contacts.map((x, i) =>
                          i === index ? { ...x, name: e.target.value } : x,
                        ),
                      }))
                    }
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    aria-label="Remove contact"
                    onClick={() =>
                      patch((d) => ({ ...d, contacts: d.contacts.filter((_, i) => i !== index) }))
                    }
                  >
                    <X className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={c.phone}
                    inputMode="tel"
                    placeholder="Phone number"
                    onChange={(e) =>
                      patch((d) => ({
                        ...d,
                        contacts: d.contacts.map((x, i) =>
                          i === index ? { ...x, phone: e.target.value } : x,
                        ),
                      }))
                    }
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={c.relation}
                    placeholder="Relation"
                    onChange={(e) =>
                      patch((d) => ({
                        ...d,
                        contacts: d.contacts.map((x, i) =>
                          i === index ? { ...x, relation: e.target.value } : x,
                        ),
                      }))
                    }
                    className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
            {draft.contacts.length < 5 && (
              <button
                onClick={() =>
                  patch((d) => ({
                    ...d,
                    contacts: [
                      ...d.contacts,
                      { id: uid(), name: "", phone: "", relation: "Contact" },
                    ],
                  }))
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-bold"
              >
                <Plus className="size-4" /> Add contact
              </button>
            )}
          </div>
        </section>

        <button
          onClick={() => void save()}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />} Save details
        </button>
      </main>
    </div>
  );
}

function ChipList({
  label,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [value, setValue] = useState("");

  const add = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  return (
    <section>
      <p className="text-sm font-bold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-semibold"
          >
            {item}
            <button aria-label={`Remove ${item}`} onClick={() => onRemove(index)}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={`Add ${label.toLowerCase()}`}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm"
        />
        <button onClick={add} className="rounded-xl bg-ink px-4 font-bold text-ink-foreground">
          Add
        </button>
      </div>
    </section>
  );
}
