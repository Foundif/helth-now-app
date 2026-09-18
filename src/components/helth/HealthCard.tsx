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
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex items-center gap-2 p-2.5">
            <div className="flex-1 truncate rounded-lg bg-primary px-3 py-2">
              <span className="text-sm font-extrabold text-primary-foreground">EMERGENCY</span>{" "}
              <span className="text-sm font-semibold text-ink">Health Card</span>
            </div>
            <Cross className="size-8 shrink-0 fill-primary text-primary" strokeWidth={3} />
          </div>

          <div className="flex-1 overflow-hidden px-3 py-1">
            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No emergency contacts added yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-3">
                {contacts.slice(0, 2).map((c, i) => (
                  <div key={c.id} className="min-w-0">
                    <p className="truncate text-[8px] font-bold tracking-wide text-primary">
                      {i === 0 ? "PRIMARY CONTACT" : (c.relation || "CONTACT").toUpperCase()}
                    </p>
                    <p className="truncate text-[11px] font-extrabold text-foreground">{c.name}</p>
                    <p className="truncate text-[10px] font-bold text-foreground">{c.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-primary/30 px-3 pt-1.5">
            <p className="text-[8px] text-muted-foreground">
              In emergency: call number above or scan QR on front
            </p>
            <div className="mt-1 flex items-end justify-between">
              <div className="flex gap-3">
                <span>
                  <span className="flex items-center gap-1 text-sm leading-tight font-extrabold">
                    <Phone className="size-3 fill-primary text-primary" /> 108
                  </span>
                  <span className="text-[8px] font-semibold text-primary">Ambulance</span>
                </span>
                <span>
                  <span className="flex items-center gap-1 text-sm leading-tight font-extrabold">
                    <Phone className="size-3 fill-primary text-primary" /> 112
                  </span>
                  <span className="text-[8px] font-semibold text-primary">Emergency</span>
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs font-extrabold text-primary">{cardId}</p>
                <p className="truncate text-[8px] text-muted-foreground">{host}</p>
              </div>
            </div>
          </div>

          <p className="flex items-center justify-center gap-1 border-t border-border py-1 text-[9px] text-muted-foreground">
            <RotateCcw className="size-2.5" /> Tap to flip back
          </p>
        </div>
      </div>
    </button>
  );
}
