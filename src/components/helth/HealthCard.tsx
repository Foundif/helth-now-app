import { Cross, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { cardUrl } from "@/lib/card-utils";

export function HealthCard({
  cardId,
  name,
  bloodGroup,
}: {
  cardId: string;
  name: string;
  bloodGroup: string;
}) {
  const [link, setLink] = useState("");

  useEffect(() => {
    setLink(cardUrl(cardId));
  }, [cardId]);

  const qrUrl = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(link)}`
    : "";
  const host = link ? new URL(link).host : "";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
      <div className="flex">
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
    </div>
  );
}
