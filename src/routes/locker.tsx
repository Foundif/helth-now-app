import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, FolderOpen, Upload, X, FileText, ChevronRight, Plus } from "lucide-react";
import { BottomNav } from "@/components/helth/BottomNav";
import { useHelth, activeMember, uid, type HealthDoc } from "@/lib/helth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/locker")({
  head: () => ({
    meta: [
      { title: "Health Locker — Helth" },
      {
        name: "description",
        content: "Store prescriptions, lab reports and scans for your whole family in Helth.",
      },
      { property: "og:title", content: "Health Locker — Helth" },
      {
        property: "og:description",
        content: "Store prescriptions, lab reports and scans for your whole family in Helth.",
      },
    ],
  }),
  component: LockerPage,
});

const types: HealthDoc["type"][] = ["Lab Report", "Prescription", "Other"];

function LockerPage() {
  const { state, update } = useHelth();
  const member = activeMember(state);
  const docs = state.documents.filter((d) => d.memberId === member.id);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<HealthDoc["type"]>("Lab Report");
  const [fileName, setFileName] = useState("");

  const groups = docs.reduce<Record<string, HealthDoc[]>>((acc, d) => {
    const key = d.date.split(" ").slice(1).join(" ").toUpperCase();
    (acc[key] ||= []).push(d);
    return acc;
  }, {});

  const upload = () => {
    if (!fileName) return;
    update((s) => ({
      ...s,
      documents: [
        {
          id: uid(),
          name: fileName,
          type,
          size: "1.4 MB",
          date: new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          memberId: member.id,
        },
        ...s.documents,
      ],
    }));
    setFileName("");
    setOpen(false);
    toast.success("Document uploaded securely");
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-40">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <p className="text-[11px] font-semibold tracking-wide opacity-60">VIEWING DOCUMENTS FOR</p>
        <div className="mt-3 flex gap-4">
          {state.members.map((m) => (
            <button
              key={m.id}
              onClick={() => update((s) => ({ ...s, activeMemberId: m.id }))}
              className="text-center"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-full bg-success/25 text-2xl ${
                  m.id === member.id ? "ring-2 ring-success" : "opacity-70"
                }`}
              >
                {m.emoji}
              </span>
              <span className="mt-1 block text-[11px] font-semibold">{m.name.split(" ")[0]}</span>
            </button>
          ))}
          <button
            onClick={() => toast("Adding family members comes with your family plan")}
            className="text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full border border-dashed border-white/40">
              <Plus className="size-5" />
            </span>
            <span className="mt-1 block text-[11px] font-semibold opacity-70">Add</span>
          </button>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          {member.name.split(" ")[0]}'s Locker
        </h1>
      </header>

      <main className="px-5 py-5">
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-success/60 bg-success/5 px-4 py-10 text-center">
            <FolderOpen className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-bold">Upload your first health document</p>
            <p className="text-sm text-muted-foreground">
              Camera · Gallery · PDF — stored securely
            </p>
          </div>
        ) : (
          Object.entries(groups).map(([month, items]) => (
            <section key={month} className="mb-5">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
                {month}
              </p>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {items.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => toast(`${d.name} · ${d.type}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <FileText className="size-5 text-primary" />
                    <span className="flex-1">
                      <span className="block text-sm font-bold">{d.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.date} · {d.type} · {d.size}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <div className="fixed inset-x-0 bottom-16 mx-auto max-w-md bg-background px-5 pt-2 pb-3">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-primary py-4 font-bold text-primary-foreground"
        >
          + Upload Document
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="mx-auto w-full max-w-md rounded-t-2xl bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Upload Record</h2>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-border p-5 text-center">
              <Upload className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Take a photo or select files</p>
              <div className="mt-3 flex justify-center gap-3">
                <button
                  onClick={() => setFileName(`scan-${Date.now().toString().slice(-4)}.jpg`)}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
                >
                  <Camera className="size-4" /> Camera
                </button>
                <button
                  onClick={() => setFileName(`report-${Date.now().toString().slice(-4)}.pdf`)}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
                >
                  <FolderOpen className="size-4" /> Browse
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {fileName || "PDF, JPG, PNG up to 20 MB"}
              </p>
            </div>

            <p className="mt-4 font-bold">Document Type</p>
            <div className="mt-2 flex gap-2">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    t === type
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 font-semibold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={upload}
                disabled={!fileName}
                className="flex-[2] rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
