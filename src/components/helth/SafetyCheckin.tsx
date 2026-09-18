import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useHelth } from "@/lib/helth-store";
import { getCheckinSettings, confirmSafe, reportMissedCheckin } from "@/lib/checkin.functions";
import { startAlarm, stopAlarm, vibrate } from "@/lib/alarm-sound";

const GRACE_MS = 10_000;
const POLL_MS = 15_000;

export function SafetyCheckin() {
  const { state } = useHelth();
  const session = state.session;
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["checkin-settings", session?.cardId],
    queryFn: () => getCheckinSettings({ data: { cardId: session!.cardId, phone: session!.phone } }),
    enabled: !!session,
    refetchInterval: POLL_MS,
  });

  const [phase, setPhase] = useState<"idle" | "asking" | "alarm">("idle");
  const [graceLeft, setGraceLeft] = useState(10);
  const graceTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const dueTimerRef = useRef<number | null>(null);

  const clearAllTimers = () => {
    if (graceTimerRef.current !== null) window.clearTimeout(graceTimerRef.current);
    if (tickTimerRef.current !== null) window.clearInterval(tickTimerRef.current);
    if (dueTimerRef.current !== null) window.clearTimeout(dueTimerRef.current);
    graceTimerRef.current = null;
    tickTimerRef.current = null;
    dueTimerRef.current = null;
  };

  // Schedule the next "are you safe?" prompt based on last confirmed time + interval.
  useEffect(() => {
    const settings = settingsQuery.data;
    if (dueTimerRef.current !== null) {
      window.clearTimeout(dueTimerRef.current);
      dueTimerRef.current = null;
    }
    if (!session || !settings?.enabled) return;

    const lastConfirmed = settings.lastConfirmedAt
      ? new Date(settings.lastConfirmedAt).getTime()
      : Date.now();
    const dueAt = lastConfirmed + settings.intervalMinutes * 60_000;
    const delay = Math.max(0, dueAt - Date.now());

    dueTimerRef.current = window.setTimeout(() => {
      setPhase("asking");
      setGraceLeft(10);
    }, delay);

    return () => {
      if (dueTimerRef.current !== null) window.clearTimeout(dueTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session?.cardId,
    settingsQuery.data?.enabled,
    settingsQuery.data?.lastConfirmedAt,
    settingsQuery.data?.intervalMinutes,
  ]);

  // Run the 10-second visible countdown, then escalate to the alarm.
  useEffect(() => {
    if (phase !== "asking") return;
    tickTimerRef.current = window.setInterval(() => {
      setGraceLeft((n) => Math.max(0, n - 1));
    }, 1000);
    graceTimerRef.current = window.setTimeout(() => {
      setPhase("alarm");
      startAlarm();
      if (session) {
        void reportMissedCheckin({ data: { cardId: session.cardId, phone: session.phone } });
      }
    }, GRACE_MS);
    return () => {
      if (tickTimerRef.current !== null) window.clearInterval(tickTimerRef.current);
      if (graceTimerRef.current !== null) window.clearTimeout(graceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => stopAlarm, []); // stop the alarm if this ever unmounts (e.g. hot reload)

  const imSafe = async () => {
    if (!session) return;
    clearAllTimers();
    stopAlarm();
    setPhase("idle");
    try {
      await confirmSafe({ data: { cardId: session.cardId, phone: session.phone } });
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["checkin-settings", session.cardId] });
    }
  };

  if (phase === "idle" || !session) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-xl">
        <ShieldAlert
          className={`mx-auto size-12 ${phase === "alarm" ? "animate-pulse text-destructive" : "text-primary"}`}
        />
        <h2 className="mt-3 text-xl font-extrabold">
          {phase === "alarm" ? "Are you okay?" : "Safety check-in"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {phase === "alarm"
            ? "You didn't respond in time. Your family has been alerted. Tap below if you're safe."
            : `Tap "I'm safe" within ${graceLeft}s, or your family will be notified.`}
        </p>
        {phase === "asking" && (
          <div className="mx-auto mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${(graceLeft / 10) * 100}%` }}
            />
          </div>
        )}
        <button
          onClick={() => void imSafe()}
          className="mt-5 w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground active:opacity-90"
        >
          I'm safe
        </button>
      </div>
    </div>
  );
}
