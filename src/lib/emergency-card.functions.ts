import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";

export type PublicContact = { id: string; name: string; phone: string; relation: string };
export type EmergencyCardInput = {
  cardId: string;
  holderName: string;
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  contacts: PublicContact[];
  editToken: string;
};
export type PublicEmergencyCard = Omit<EmergencyCardInput, "editToken"> & { updatedAt: string };

const cardPattern = /^[A-Z0-9]{6,20}$/;
const bloodGroups = new Set(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cleanInput(input: EmergencyCardInput): EmergencyCardInput {
  const cardId = input.cardId.trim().toUpperCase();
  const holderName = input.holderName.trim();
  if (!cardPattern.test(cardId)) throw new Error("Invalid card ID");
  if (!holderName || holderName.length > 100) throw new Error("Enter a valid name");
  if (!bloodGroups.has(input.bloodGroup)) throw new Error("Select a valid blood group");
  if (input.editToken.length < 24) throw new Error("Invalid edit key");
  const cleanList = (values: string[]) => values.map((v) => v.trim()).filter(Boolean).slice(0, 20);
  return {
    ...input,
    cardId,
    holderName,
    allergies: cleanList(input.allergies),
    medications: cleanList(input.medications),
    conditions: cleanList(input.conditions),
    contacts: input.contacts.slice(0, 5).map((contact) => ({
      id: contact.id.slice(0, 40),
      name: contact.name.trim().slice(0, 100),
      phone: contact.phone.trim().slice(0, 30),
      relation: contact.relation.trim().slice(0, 50),
    })).filter((contact) => contact.name && /^[+()\d\s-]{7,30}$/.test(contact.phone)),
  };
}

export const saveEmergencyCard = createServerFn({ method: "POST" })
  .inputValidator((input: EmergencyCardInput) => cleanInput(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (table: string) => {
        select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: { edit_token_hash: string } | null; error: { message: string } | null }> } };
        upsert: (value: Record<string, unknown>, options: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
      };
    };
    const editTokenHash = hashToken(data.editToken);
    const existing = await client.from("emergency_cards").select("edit_token_hash").eq("card_id", data.cardId).maybeSingle();
    if (existing.error) throw new Error("Could not verify this card");
    if (existing.data && existing.data.edit_token_hash !== editTokenHash) {
      throw new Error("This card ID is already linked to another device");
    }
    const { error } = await client.from("emergency_cards").upsert({
      card_id: data.cardId,
      holder_name: data.holderName,
      blood_group: data.bloodGroup,
      allergies: data.allergies,
      medications: data.medications,
      conditions: data.conditions,
      contacts: data.contacts,
      edit_token_hash: editTokenHash,
      updated_at: new Date().toISOString(),
    }, { onConflict: "card_id" });
    if (error) throw new Error("Could not publish emergency details");
    return { ok: true };
  });

export const getEmergencyCard = createServerFn({ method: "GET" })
  .inputValidator((input: { cardId: string }) => ({ cardId: input.cardId.trim().toUpperCase() }))
  .handler(async ({ data }): Promise<PublicEmergencyCard | null> => {
    if (!cardPattern.test(data.cardId)) return null;
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Emergency card service is unavailable");
    const response = await fetch(`${url}/rest/v1/emergency_cards?card_id=eq.${encodeURIComponent(data.cardId)}&select=card_id,holder_name,blood_group,allergies,medications,conditions,contacts,updated_at`, {
      headers: { apikey: key, Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Could not load emergency card");
    const rows = await response.json() as Array<{
      card_id: string; holder_name: string; blood_group: string; allergies: string[];
      medications: string[]; conditions: string[]; contacts: PublicContact[]; updated_at: string;
    }>;
    const row = rows[0];
    if (!row) return null;
    return {
      cardId: row.card_id, holderName: row.holder_name, bloodGroup: row.blood_group,
      allergies: row.allergies, medications: row.medications, conditions: row.conditions,
      contacts: row.contacts, updatedAt: row.updated_at,
    };
  });
