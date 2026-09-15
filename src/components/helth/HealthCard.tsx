import { Cross, Wifi, Phone, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { cardUrl } from "@/lib/card-utils";
import type { Contact } from "@/lib/helth.functions";

export function HealthCard({
  cardId,
  name,
  bloodGroup,
  contacts = [],
}: {
  cardId: string;
  name: string;
  bloodGroup: string;
  contacts?: Contact[];
}) {
  const [link, setLink] = useState("");
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setLink(cardUrl(cardId));
  }, [cardId]);

  const qrUrl = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(link)}`
    : "";
  const host = link ? new URL(link).host : "";

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-label={flipped ? "Show card front" : "Flip card to see emergency contacts"}
      className="block aspect-8/5 w-full text-left [perspective:1200px]"
    >
      <div
        className="relative size-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm [backface-visibility:hidden]">
          <div className="flex items-center gap-2 p-2.5">
            <Cross className="size-8 shrink-0 fill-primary text-primary" strokeWidth={3} />
            <div className="flex flex-1 items-center justify-between rounded-lg bg-ink px-3 py-2 text-ink-foreground">
              <span className="text-lg font-extrabold tracking-tight">
                hel<span className="text-primary">t</span>h
              </span>
              <span className="text-[10px] leading-tight font-semibold">
                Emergency
                <br />
                Health Card
              </span>
              <Wifi className="size-4 rotate-90 text-primary" />
            </div>
          </div>
          <div className="flex flex-1">
            <div className="flex-1 bg-primary p-3 text-primary-foreground">
              <p className="text-[9px] opacity-80">Card Holder's Name:</p>
              <p className="text-sm font-bold">{name || "Add your name"}</p>
              <p className="mt-1 text-[9px] opacity-80">Blood Group:</p>
              <p className="text-4xl leading-none font-extrabold">{bloodGroup || "—"}</p>
            </div>
            <div className="w-[38%] p-2 text-center">
              <p className="text-[8px] font-bold text-muted-foreground">
                SCAN IN <span className="text-primary">EMERGENCY</span>
              </p>
              <div className="mx-auto aspect-square w-full">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt={`QR code linking to emergency card ${cardId}`}
                    className="size-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="size-full animate-pulse rounded bg-muted" />
                )}
              </div>
              <p className="truncate text-[8px] text-muted-foreground">
                {host}/<span className="font-semibold text-primary">{cardId}</span>
              </p>
            </div>
          </div>
          <p className="flex items-center justify-center gap-1 border-t border-border py-1 text-[9px] text-muted-foreground">
            <RotateCcw className="size-2.5" /> Tap for emergency contacts
          </p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-ink text-ink-foreground shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <Cross className="size-5 shrink-0 fill-primary text-primary" strokeWidth={3} />
            <span className="text-xs font-bold tracking-wide">EMERGENCY CONTACTS</span>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
            {contacts.length === 0 ? (
              <p className="text-xs opacity-60">No contacts added yet.</p>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">{c.name}</span>
                    <span className="block truncate text-[10px] opacity-70">
                      {c.relation ? `${c.relation} · ` : ""}
                      {c.phone}
                    </span>
                  </span>
                  <Phone className="size-3.5 shrink-0 text-primary" />
                </div>
              ))
            )}
          </div>
          <p className="flex items-center justify-center gap-1 border-t border-white/10 py-1 text-[9px] opacity-60">
            <RotateCcw className="size-2.5" /> Tap to flip back
          </p>
        </div>
      </div>
    </button>
  );
}
