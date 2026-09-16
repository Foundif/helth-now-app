import { createServerFn } from "@tanstack/react-start";
import { admin, requireOwner } from "@/lib/helth.functions";
import { logFamilyAlert } from "@/lib/family.functions";

export type CheckinSettings = {
  enabled: boolean;
  intervalMinutes: number;
  lastConfirmedAt: string | null;
};

export const getCheckinSettings = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<CheckinSettings> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: settings } = await db
      .from("safety_checkins")
      .select("enabled, interval_minutes, last_confirmed_at")
      .eq("card_id", row.card_id)
      .maybeSingle();
    if (!settings) return { enabled: false, intervalMinutes: 30, lastConfirmedAt: null };
    return {
      enabled: settings.enabled,
      intervalMinutes: settings.interval_minutes,
      lastConfirmedAt: settings.last_confirmed_at,
    };
  });

export const setCheckinSettings = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { cardId: string; phone: string; enabled: boolean; intervalMinutes: number }) => ({
      ...input,
      intervalMinutes: Math.min(720, Math.max(5, Math.round(input.intervalMinutes))),
    }),
  )
  .handler(async ({ data }): Promise<CheckinSettings> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const nowIso = new Date().toISOString();
    const { error } = await db.from("safety_checkins").upsert({
      card_id: row.card_id,
      enabled: data.enabled,
      interval_minutes: data.intervalMinutes,
      last_confirmed_at: nowIso,
      updated_at: nowIso,
    });
    if (error) throw new Error("Could not save check-in settings");
    return {
      enabled: data.enabled,
      intervalMinutes: data.intervalMinutes,
      lastConfirmedAt: nowIso,
    };
  });

/** The "I'm safe" tap — resets the countdown to a fresh full interval. */
export const confirmSafe = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<{ lastConfirmedAt: string }> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const nowIso = new Date().toISOString();
    const { error } = await db
      .from("safety_checkins")
      .update({ last_confirmed_at: nowIso, updated_at: nowIso })
      .eq("card_id", row.card_id);
    if (error) throw new Error("Could not confirm safe status");
    return { lastConfirmedAt: nowIso };
  });

/**
 * Called by the client when the 10-second "are you safe?" grace period elapses
 * with no response. Logs a family alert (throttled to avoid duplicate spam).
 */
export const reportMissedCheckin = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await db
      .from("family_alerts")
      .select("id")
      .eq("card_id", row.card_id)
      .eq("type", "checkin_missed")
      .gte("created_at", tenMinAgo)
      .limit(1);
    if (recent && recent.length > 0) return;
    await logFamilyAlert(
      row.card_id,
      "checkin_missed",
      `${row.holder_name || "A family member"} didn't confirm their safety check-in`,
    );
  });
