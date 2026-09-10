import { Cross, Wifi } from "lucide-react";
import type { Member } from "@/lib/helth-store";

export function HealthCard({ member }: { member: Member }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(
    `https://gethelth.com/${member.cardId}`,
  )}`;

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
          <p className="text-sm font-bold">{member.name}</p>
          <p className="mt-1 text-[9px] opacity-80">Blood Group:</p>
          <p className="text-4xl leading-none font-extrabold">{member.bloodGroup}</p>
        </div>
        <div className="w-[38%] p-2 text-center">
          <p className="text-[8px] font-bold text-muted-foreground">
            SCAN IN <span className="text-primary">EMERGENCY</span>
          </p>
          <img src={qrUrl} alt={`QR code for card ${member.cardId}`} className="mx-auto w-full" />
          <p className="text-[8px] text-muted-foreground">
            gethelth.com/<span className="font-semibold text-primary">{member.cardId}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
