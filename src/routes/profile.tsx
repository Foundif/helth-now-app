import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, X, Plus } from "lucide-react";
import { useHelth, activeMember, uid, type Member } from "@/lib/helth-store";
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

function ProfilePage() {
  const { state, update } = useHelth();
  const member = activeMember(state);

  const patch = (fn: (m: Member) => Member) =>
    update((s) => ({ ...s, members: s.members.map((m) => (m.id === member.id ? fn(m) : m)) }));

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <header className="flex items-center gap-3 bg-ink px-5 py-5 text-ink-foreground">
        <Link to="/settings" aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-extrabold">Edit Profile</h1>
      </header>

      <main className="space-y-6 px-5 py-5">
        <div>
          <label className="text-sm font-bold" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            value={member.name}
            onChange={(e) => patch((m) => ({ ...m, name: e.target.value }))}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3"
          />
        </div>

        <div>
          <p className="text-sm font-bold">Blood group</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {bloodGroups.map((b) => (
              <button
                key={b}
                onClick={() => patch((m) => ({ ...m, bloodGroup: b }))}
                className={`rounded-xl border py-3 font-bold ${
                  b === member.bloodGroup
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
          items={member.allergies}
          onAdd={(v) => patch((m) => ({ ...m, allergies: [...m.allergies, v] }))}
          onRemove={(i) =>
            patch((m) => ({ ...m, allergies: m.allergies.filter((_, x) => x !== i) }))
          }
        />
        <ChipList
          label="Medications"
          items={member.medications}
          onAdd={(v) => patch((m) => ({ ...m, medications: [...m.medications, v] }))}
          onRemove={(i) =>
            patch((m) => ({ ...m, medications: m.medications.filter((_, x) => x !== i) }))
          }
        />
        <ChipList
          label="Conditions"
          items={member.conditions}
          onAdd={(v) => patch((m) => ({ ...m, conditions: [...m.conditions, v] }))}
          onRemove={(i) =>
            patch((m) => ({ ...m, conditions: m.conditions.filter((_, x) => x !== i) }))
          }
        />

        <Contacts memberId={member.id} />

        <button
          onClick={() => toast.success("Profile saved")}
          className="w-full rounded-xl bg-primary py-4 font-bold text-primary-foreground"
        >
          Save changes
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
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div>
      <p className="text-sm font-bold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length === 0 && <span className="text-sm text-muted-foreground">None reported</span>}
        {items.map((it, i) => (
          <span
            key={`${it}-${i}`}
            className="flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
          >
            {it}
            <button onClick={() => onRemove(i)} aria-label={`Remove ${it}`}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}`}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
        />
        <button
          onClick={() => {
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          className="rounded-xl bg-ink px-4 text-ink-foreground"
          aria-label={`Add ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Contacts({ memberId }: { memberId: string }) {
  const { state, update } = useHelth();
  const member = state.members.find((m) => m.id === memberId)!;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const add = () => {
    if (!name.trim() || !phone.trim()) return;
    update((s) => ({
      ...s,
      members: s.members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              contacts: [
                ...m.contacts,
                { id: uid(), name: name.trim(), phone: phone.trim(), relation: "Contact" },
              ],
            }
          : m,
      ),
    }));
    setName("");
    setPhone("");
  };

  return (
    <div>
      <p className="text-sm font-bold">Emergency contacts</p>
      <div className="mt-2 space-y-2">
        {member.contacts.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="flex-1">
              <span className="block text-sm font-bold">{c.name}</span>
              <span className="block text-xs text-muted-foreground">
                {c.phone} · {c.relation}
              </span>
            </span>
            <button
              aria-label={`Remove ${c.name}`}
              onClick={() =>
                update((s) => ({
                  ...s,
                  members: s.members.map((m) =>
                    m.id === memberId
                      ? { ...m, contacts: m.contacts.filter((x) => x.id !== c.id) }
                      : m,
                  ),
                }))
              }
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contact name"
          className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
        />
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
          />
          <button onClick={add} className="rounded-xl bg-ink px-4 text-ink-foreground">
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
