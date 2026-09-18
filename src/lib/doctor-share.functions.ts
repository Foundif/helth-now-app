import { createServerFn } from "@tanstack/react-start";
import { admin, requireOwner, type Contact } from "@/lib/helth.functions";

export type DoctorShareSummary = {
  id: string;
  label: string;
  includeAllergies: boolean;
  includeMedications: boolean;
  includeConditions: boolean;
  includeContacts: boolean;
  documentCount: number;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
};

export type DoctorShareView = {
  holderName: string;
  bloodGroup: string;
  allergies: string[] | null;
  medications: string[] | null;
  conditions: string[] | null;
  contacts: Contact[] | null;
  documents: { id: string; name: string; url: string | null }[];
  expiresAt: string;
};

type ShareRow = {
  id: string;
  label: string;
  include_allergies: boolean;
  include_medications: boolean;
  include_conditions: boolean;
  include_contacts: boolean;
  document_ids: string[];
  expires_at: string;
  revoked: boolean;
  created_at: string;
};

function mapShare(r: ShareRow): DoctorShareSummary {
  return {
    id: r.id,
    label: r.label,
    includeAllergies: r.include_allergies,
    includeMedications: r.include_medications,
    includeConditions: r.include_conditions,
    includeContacts: r.include_contacts,
    documentCount: r.document_ids.length,
    expiresAt: r.expires_at,
    revoked: r.revoked,
    createdAt: r.created_at,
  };
}

const SHARE_COLUMNS =
  "id, label, include_allergies, include_medications, include_conditions, include_contacts, document_ids, expires_at, revoked, created_at";

export const createDoctorShare = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      cardId: string;
      phone: string;
      label: string;
      includeAllergies: boolean;
      includeMedications: boolean;
      includeConditions: boolean;
      includeContacts: boolean;
      documentIds: string[];
      expiresInHours: number;
    }) => ({
      ...input,
      label: input.label.trim().slice(0, 80),
      expiresInHours: Math.min(24 * 30, Math.max(1, Math.round(input.expiresInHours))),
      documentIds: input.documentIds.slice(0, 20),
    }),
  )
  .handler(async ({ data }): Promise<DoctorShareSummary> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const expiresAt = new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000).toISOString();
    const { data: inserted, error } = await db
      .from("doctor_shares")
      .insert({
        card_id: row.card_id,
        label: data.label || "Doctor visit",
        include_allergies: data.includeAllergies,
        include_medications: data.includeMedications,
        include_conditions: data.includeConditions,
        include_contacts: data.includeContacts,
        document_ids: data.documentIds,
        expires_at: expiresAt,
      })
      .select(SHARE_COLUMNS)
      .single();
    if (error || !inserted) throw new Error("Could not create the share link");
    return mapShare(inserted);
  });

export const listDoctorShares = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<DoctorShareSummary[]> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: rows, error } = await db
      .from("doctor_shares")
      .select(SHARE_COLUMNS)
      .eq("card_id", row.card_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Could not load your share links");
    return (rows ?? []).map(mapShare);
  });

export const revokeDoctorShare = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; id: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { error } = await db
      .from("doctor_shares")
      .update({ revoked: true })
      .eq("id", data.id)
      .eq("card_id", row.card_id);
    if (error) throw new Error("Could not revoke this share link");
  });

/** Public: a doctor opens this link with no login. Returns null if expired/revoked/missing. */
export const getDoctorShare = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<DoctorShareView | null> => {
    const db = await admin();
    const { data: share } = await db
      .from("doctor_shares")
      .select(
        "id, label, include_allergies, include_medications, include_conditions, include_contacts, document_ids, expires_at, revoked, created_at, card_id",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (!share || share.revoked) return null;
    if (new Date(share.expires_at).getTime() < Date.now()) return null;

    const { data: card } = await db
      .from("emergency_cards")
      .select("holder_name, blood_group, allergies, medications, conditions, contacts")
      .eq("card_id", share.card_id)
      .maybeSingle();
    if (!card) return null;

    let documents: DoctorShareView["documents"] = [];
    if (share.document_ids.length) {
      const { data: docs } = await db
        .from("health_documents")
        .select("id, name, storage_path")
        .eq("card_id", share.card_id)
        .in("id", share.document_ids);
      documents = await Promise.all(
        (docs ?? []).map(async (d) => {
          const signed = await db.storage
            .from("health-docs")
            .createSignedUrl(d.storage_path, 60 * 60);
          return { id: d.id, name: d.name, url: signed.data?.signedUrl ?? null };
        }),
      );
    }

    return {
      holderName: card.holder_name,
      bloodGroup: card.blood_group,
      allergies: share.include_allergies ? card.allergies : null,
      medications: share.include_medications ? card.medications : null,
      conditions: share.include_conditions ? card.conditions : null,
      contacts: share.include_contacts
        ? Array.isArray(card.contacts)
          ? (card.contacts as unknown as Contact[])
          : []
        : null,
      documents,
      expiresAt: share.expires_at,
    };
  });
