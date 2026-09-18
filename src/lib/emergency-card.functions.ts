import { createServerFn } from "@tanstack/react-start";
import { admin } from "@/lib/helth.functions";
import { logFamilyAlert } from "@/lib/family.functions";

export type PublicContact = { id: string; name: string; phone: string; relation: string };

export type PublicEmergencyCard = {
  cardId: string;
  holderName: string;
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  contacts: PublicContact[];
  updatedAt: string;
};

const cardPattern = /^[A-Z0-9]{4,20}$/;

/** Logs a "card was viewed" family alert, throttled to once per 5 minutes per card. */
async function logScanAlert(cardId: string) {
  try {
    const db = await admin();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recent } = await db
      .from("family_alerts")
      .select("id")
      .eq("card_id", cardId)
      .eq("type", "scan")
      .gte("created_at", fiveMinAgo)
      .limit(1);
    if (recent && recent.length > 0) return;
    await logFamilyAlert(cardId, "scan", "Your Helth card was scanned");
  } catch {
    // Never let alert logging break someone viewing an emergency card.
  }
}

export const getEmergencyCard = createServerFn({ method: "GET" })
  .inputValidator((input: { cardId: string; viewerCardId: string | undefined }) => ({
    cardId: input.cardId.trim().toUpperCase(),
    viewerCardId: input.viewerCardId?.trim().toUpperCase() || null,
  }))
  .handler(async ({ data }): Promise<PublicEmergencyCard | null> => {
    if (!cardPattern.test(data.cardId)) return null;
    const db = await admin();
    const { data: row, error } = await db
      .from("emergency_cards")
      .select("card_id,holder_name,blood_group,allergies,medications,conditions,contacts,updated_at")
      .eq("card_id", data.cardId)
      .maybeSingle();
    if (error) throw new Error("Could not load emergency card");
    if (!row || !row.holder_name) return null;

    if (data.viewerCardId !== data.cardId) {
      await logScanAlert(data.cardId);
    }

    return {
      cardId: row.card_id,
      holderName: row.holder_name,
      bloodGroup: row.blood_group,
      allergies: row.allergies ?? [],
      medications: row.medications ?? [],
      conditions: row.conditions ?? [],
      contacts: row.contacts ?? [],
      updatedAt: row.updated_at,
    };
  });
