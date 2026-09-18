import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  AlertTriangle,
  Loader2,
  MapPin,
  MapPinOff,
  Phone,
  MessageCircle,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import type { Contact } from "@/lib/helth.functions";
import { sendSosAlert } from "@/lib/sos.functions";
import { cardUrl } from "@/lib/card-utils";
import { startAlarm, stopAlarm, vibrate } from "@/lib/alarm-sound";
import { toast } from "sonner";

const HOLD_MS = 1600;

function getLocationUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30_000 },
    );
  });
}

export function SosButton({
  cardId,
  phone,
  name,
  contacts,
}: {
  cardId: string;
  phone: string;
  name: string;
  contacts: Contact[];
}) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    locationUrl: string | null;
    notifiedFamily: boolean;
  } | null>(null);

  const cancelHold = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
  };

  useEffect(() => stopAlarm, []); // stop the siren if this ever unmounts (e.g. navigating away)

  const activate = async () => {
    cancelHold();
    setSending(true);
    startAlarm(); // loud siren fires immediately — draws attention while the alert sends
    vibrate([300, 120, 300, 120, 600]); // long SOS buzz pattern alongside the siren
    try {
      const locationUrl = await getLocationUrl();
      const { notifiedFamily } = await sendSosAlert({ data: { cardId, phone, locationUrl } });
      setResult({ locationUrl, notifiedFamily });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send SOS. Try calling directly.",
      );
    } finally {
      setSending(false);
    }
  };

  const startHold = (e: PointerEvent) => {
    e.preventDefault();
    startRef.current = Date.now();
    const step = () => {
      const pct = Math.min(100, ((Date.now() - startRef.current) / HOLD_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        rafRef.current = null;
        void activate();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const smsHref = (c: Contact) => {
    const link = cardUrl(cardId);
    const msg = `SOS from ${name || "me"} via Helth. ${
      result?.locationUrl ? `My location: ${result.locationUrl}. ` : ""
    }My emergency card: ${link}`;
    return `sms:${c.phone}?body=${encodeURIComponent(msg)}`;
  };

  return (
    <>
      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        disabled={sending}
        aria-label="Hold for 2 seconds to send an SOS alert"
        className="relative block w-full touch-none overflow-hidden rounded-2xl bg-destructive py-4 text-center select-none disabled:opacity-70"
      >
        <div
          className="absolute inset-y-0 left-0 bg-black/25"
          style={{
            width: `${progress}%`,
            transition: progress === 0 ? "width 150ms ease-out" : "none",
          }}
        />
        <span className="relative flex items-center justify-center gap-2 font-extrabold text-destructive-foreground">
          {sending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <AlertTriangle className="size-5" />
          )}
          {sending ? "Sending SOS…" : "Hold 2s for Emergency SOS"}
        </span>
      </button>

      {result && (
        <div className="fixed inset-0 z-[9997] flex items-end bg-black/60 sm:items-center sm:justify-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-destructive">
                <AlertTriangle className="size-5" /> SOS sent
              </h2>
              <button
                onClick={() => {
                  stopAlarm();
                  setResult(null);
                }}
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <button
              onClick={stopAlarm}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground"
            >
              <VolumeX className="size-4" /> Stop alarm sound
            </button>

            <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
              {result.locationUrl ? (
                <MapPin className="size-4 shrink-0 text-primary" />
              ) : (
                <MapPinOff className="size-4 shrink-0 text-muted-foreground" />
              )}
              {result.locationUrl
                ? "Your location was captured"
                : "Location unavailable — turn on location for next time"}
            </div>

            <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
              <Users className="size-4 shrink-0 text-primary" />
              {result.notifiedFamily
                ? "Your family circle was alerted in-app"
                : "No family circle yet — link family in the Family tab so they get alerted too"}
            </div>

            <p className="mt-4 text-sm font-bold">Reach your contacts now</p>
            <p className="text-xs text-muted-foreground">
              Family circle members get an in-app alert automatically. Tap to call or message the
              contacts below directly.
            </p>

            {contacts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No emergency contacts saved yet — add some in your profile.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.relation ? `${c.relation} · ` : ""}
                        {c.phone}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <a
                        href={`tel:${c.phone}`}
                        aria-label={`Call ${c.name}`}
                        className="rounded-full bg-primary p-2.5 text-primary-foreground"
                      >
                        <Phone className="size-4" />
                      </a>
                      <a
                        href={smsHref(c)}
                        aria-label={`Message ${c.name}`}
                        className="rounded-full border border-border p-2.5"
                      >
                        <MessageCircle className="size-4" />
                      </a>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
