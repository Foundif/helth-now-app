import { createServerFn } from "@tanstack/react-start";

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

export const getEmergencyCard = createServerFn({ method: "GET" })
  .inputValidator((input: { cardId: string }) => ({ cardId: input.cardId.trim().toUpperCase() }))
  .handler(async ({ data }): Promise<PublicEmergencyCard | null> => {
    if (!cardPattern.test(data.cardId)) return null;
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Emergency card service is unavailable");
    const response = await fetch(
      `${url}/rest/v1/emergency_cards?card_id=eq.${encodeURIComponent(data.cardId)}&select=card_id,holder_name,blood_group,allergies,medications,conditions,contacts,updated_at`,
      { headers: { apikey: key, Accept: "application/json" } },
    );
    if (!response.ok) throw new Error("Could not load emergency card");
    const rows = (await response.json()) as Array<{
      card_id: string;
      holder_name: string;
      blood_group: string;
      allergies: string[];
      medications: string[];
      conditions: string[];
      contacts: PublicContact[];
      updated_at: string;
    }>;
    const row = rows[0];
    if (!row || !row.holder_name) return null;
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
