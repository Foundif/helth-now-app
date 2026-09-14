import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  FolderOpen,
  Upload,
  X,
  FileText,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { BottomNav } from "@/components/helth/BottomNav";
import { useRequireSession } from "@/lib/use-session";
import { useDocumentsQuery, useProfileQuery } from "@/lib/use-helth-data";
import { uploadDocument, deleteDocument, type StoredDoc } from "@/lib/helth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/locker")({
  head: () => ({
    meta: [
      { title: "Health Locker — Helth" },
      {
        name: "description",
        content: "Store prescriptions, lab reports and scans securely in your Helth locker.",
      },
      { property: "og:title", content: "Health Locker — Helth" },
      {
        property: "og:description",
        content: "Store prescriptions, lab reports and scans securely in your Helth locker.",
      },
    ],
  }),
  component: LockerPage,
});

const docTypes = ["Lab Report", "Prescription", "Other"];

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LockerPage() {
  const { session } = useRequireSession();
  const profileQuery = useProfileQuery(session);
  const docsQuery = useDocumentsQuery(session);
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState(docTypes[0]!);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const docs = docsQuery.data ?? [];
  const firstName = (profileQuery.data?.name || "Your").split(" ")[0];

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["documents", session?.cardId] });

  const upload = async () => {
    if (!file || !session) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose a file under 10 MB");
      return;
    }
    setBusy(true);
    try {
      const dataBase64 = await readAsBase64(file);
      await uploadDocument({
        data: {
          cardId: session.cardId,
          phone: session.phone,
          name: file.name,
          docType,
          contentType: file.type,
          dataBase64,
        },
      });
      await refresh();
      setFile(null);
      setOpen(false);
      toast.success("Document stored securely");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload this document");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc: StoredDoc) => {
    if (!session) return;
    try {
      await deleteDocument({ data: { cardId: session.cardId, phone: session.phone, id: doc.id } });
      await refresh();
      toast.success("Document deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this document");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-40">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <p className="text-[11px] font-semibold tracking-wide opacity-60">HEALTH LOCKER</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{firstName}'s Locker</h1>
        <p className="mt-1 text-sm opacity-60">
          {docs.length ? `${docs.length} document${docs.length > 1 ? "s" : ""} stored` : "Private to you"}
        </p>
      </header>

      <main className="px-5 py-5">
        {docsQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-success/60 bg-success/5 px-4 py-10 text-center">
            <FolderOpen className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-bold">Upload your first health document</p>
            <p className="text-sm text-muted-foreground">Camera · Gallery · PDF — stored securely</p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="size-5 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{d.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {d.docType} · {formatSize(d.sizeBytes)}
                  </span>
                </span>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${d.name}`}
                    className="rounded-lg bg-muted p-2"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
                <button
                  aria-label={`Delete ${d.name}`}
                  onClick={() => void remove(d)}
                  className="rounded-lg bg-muted p-2"
                >
                  <Trash2 className="size-4 text-primary" />
                </button>
              </div>
            ))}
          </div>
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

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

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
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
                >
                  <Camera className="size-4" /> Camera
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
                >
                  <FolderOpen className="size-4" /> Browse
                </button>
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {file ? `${file.name} · ${formatSize(file.size)}` : "PDF, JPG, PNG up to 10 MB"}
              </p>
            </div>

            <p className="mt-4 font-bold">Document Type</p>
            <div className="mt-2 flex gap-2">
              {docTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    t === docType
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
                onClick={() => void upload()}
                disabled={!file || busy}
                className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
              >
                {busy && <Loader2 className="size-4 animate-spin" />} Upload
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
