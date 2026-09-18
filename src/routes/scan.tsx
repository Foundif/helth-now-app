import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, ScanLine } from "lucide-react";
import { BottomNav } from "@/components/helth/BottomNav";
import { playBeep } from "@/lib/alarm-sound";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan a Helth card" },
      {
        name: "description",
        content: "Point your camera at a Helth QR code to open someone's emergency health info.",
      },
      { property: "og:title", content: "Scan a Helth card" },
      {
        property: "og:description",
        content: "Point your camera at a Helth QR code to open someone's emergency health info.",
      },
    ],
  }),
  component: ScanPage,
});

type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };

function cardIdFromValue(value: string) {
  const raw = value.trim();
  const match = raw.match(/\/card\/([A-Za-z0-9]{4,20})/);
  if (match?.[1]) return match[1].toUpperCase();
  if (/^[A-Za-z0-9]{4,20}$/.test(raw)) return raw.toUpperCase();
  return null;
}

function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  const open = useCallback(
    (value: string) => {
      const cardId = cardIdFromValue(value);
      if (!cardId) {
        toast.error("That code is not a Helth card");
        return false;
      }
      playBeep();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      navigate({ to: "/card/$cardId", params: { cardId } });
      return true;
    },
    [navigate],
  );

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const start = async () => {
    setStatus("starting");
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setStatus("scanning");

      const Ctor = (
        window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }
      ).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });

      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value && open(value)) return;
        } catch {
          // frame not ready
        }
        requestAnimationFrame(() => void tick());
      };
      void tick();
    } catch {
      setStatus("error");
      setMessage("Camera permission was denied. Allow camera access or enter the card ID below.");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <h1 className="text-2xl font-extrabold tracking-tight">Scan a card</h1>
        <p className="mt-1 text-sm opacity-60">
          Point the camera at the QR code on any Helth emergency card.
        </p>
      </header>

      <main className="space-y-5 px-5 py-5">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
          {status !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              {status === "starting" ? (
                <Loader2 className="size-8 animate-spin text-primary" />
              ) : (
                <ScanLine className="size-12 text-muted-foreground" strokeWidth={1.2} />
              )}
              <p className="px-6 text-sm text-muted-foreground">{message || "Camera is off"}</p>
            </div>
          )}
          {status === "scanning" && (
            <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-primary/80" />
          )}
        </div>

        {supported ? (
          <button
            onClick={start}
            disabled={status === "scanning" || status === "starting"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60"
          >
            <Camera className="size-4" />
            {status === "scanning" ? "Scanning…" : "Start camera"}
          </button>
        ) : (
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            This browser cannot scan QR codes. Open the card link directly, or enter the card ID
            below.
          </p>
        )}

        <div>
          <label className="text-sm font-bold" htmlFor="cardId">
            Or enter the card ID
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="cardId"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="ETH0001"
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 uppercase"
            />
            <button
              onClick={() => open(manual)}
              className="rounded-xl bg-ink px-5 font-bold text-ink-foreground"
            >
              Open
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
