import { createServerFn } from "@tanstack/react-start";

export type Contact = { id: string; name: string; phone: string; relation: string };

export type Profile = {
  cardId: string;
  phone: string;
  name: string;
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  contacts: Contact[];
  managedByCardId: string | null;
  updatedAt: string;
};

export type StoredDoc = {
  id: string;
  name: string;
  docType: string;
  sizeBytes: number;
  createdAt: string;
  url: string | null;
};

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
  "A1+",
  "A1-",
  "A2+",
  "A2-",
  "A1B+",
  "A1B-",
  "A2B+",
  "A2B-",
  "Bombay (hh)",
  "Rh-null",
  "Unknown",
] as const;
/** Everyday groups shown first in pickers; the rest are rare/unknown types. */
export const COMMON_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;
const bloodGroups = new Set<string>([...BLOOD_GROUPS, ""]);

export function normalizePhone(raw: string) {
  const cleaned = raw.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) throw new Error("Enter a valid phone number");
  return cleaned.startsWith("+") ? `+${digits}` : digits;
}

type Row = {
  card_id: string;
  phone: string | null;
  holder_name: string;
  blood_group: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  contacts: unknown;
  managed_by_card_id: string | null;
  updated_at: string;
};

function toProfile(row: Row): Profile {
  return {
    cardId: row.card_id,
    phone: row.phone ?? "",
    name: row.holder_name,
    bloodGroup: row.blood_group,
    allergies: row.allergies ?? [],
    medications: row.medications ?? [],
    conditions: row.conditions ?? [],
    contacts: Array.isArray(row.contacts) ? (row.contacts as Contact[]) : [],
    managedByCardId: row.managed_by_card_id,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  "card_id, phone, holder_name, blood_group, allergies, medications, conditions, contacts, managed_by_card_id, updated_at";

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Verifies the caller owns this card (phone number acts as the credential). */
export async function requireOwner(cardId: string, phone: string) {
  const db = await admin();
  const normalized = normalizePhone(phone);
  const { data, error } = await db
    .from("emergency_cards")
    .select(COLUMNS)
    .eq("card_id", cardId.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new Error("Could not reach your card right now");
  if (!data || data.phone !== normalized) throw new Error("You are not signed in to this card");
  return { db, row: data as Row, normalized };
}

/**
 * Verifies the caller owns `cardId`, then grants access to `targetCardId` -- either
 * their own card, or a dependent profile they manage (no separate phone/login).
 * Returns the row for `targetCardId` so callers act on the right record.
 */
export async function requireAccess(cardId: string, phone: string, targetCardId: string) {
  const { db, row: ownRow } = await requireOwner(cardId, phone);
  const normalizedTarget = targetCardId.trim().toUpperCase();
  if (normalizedTarget === ownRow.card_id) return { db, row: ownRow };
  const { data: targetRow, error } = await db
    .from("emergency_cards")
    .select(COLUMNS)
    .eq("card_id", normalizedTarget)
    .maybeSingle();
  if (error || !targetRow) throw new Error("Profile not found");
  if (targetRow.managed_by_card_id !== ownRow.card_id) {
    throw new Error("You don't manage this profile");
  }
  return { db, row: targetRow as Row };
}

async function createCardRow(
  db: Awaited<ReturnType<typeof admin>>,
  opts: { phone: string | null; holderName: string; managedByCardId: string | null },
): Promise<Row> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const last = await db
      .from("emergency_cards")
      .select("card_id")
      .like("card_id", "HELTH%")
      .order("card_id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastNumber = Number(last.data?.card_id?.replace("HELTH", "") ?? 0) || 0;
    const cardId = `HELTH${String(lastNumber + 1 + attempt).padStart(3, "0")}`;
    const inserted = await db
      .from("emergency_cards")
      .insert({
        card_id: cardId,
        phone: opts.phone,
        holder_name: opts.holderName,
        blood_group: "",
        allergies: [],
        medications: [],
        conditions: [],
        contacts: [],
        edit_token_hash: "",
        managed_by_card_id: opts.managedByCardId,
      })
      .select(COLUMNS)
      .maybeSingle();
    if (!inserted.error && inserted.data) return inserted.data as Row;
    if (inserted.error && !inserted.error.message.includes("duplicate")) {
      throw new Error("Could not create the card");
    }
  }
  throw new Error("Could not create the card, please try again");
}

/** Creates a dependent profile with no phone/login of its own, fully controlled by the manager. */
export async function createManagedCard(managerCardId: string, name: string): Promise<Profile> {
  const db = await admin();
  const row = await createCardRow(db, {
    phone: null,
    holderName: name.trim().slice(0, 100),
    managedByCardId: managerCardId,
  });
  return toProfile(row);
}

// ---- Password handling (salted SHA-256; Web Crypto works in the edge runtime) ----

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string) {
  const salt = crypto.randomUUID().replace(/-/g, "");
  return `${salt}:${await sha256Hex(`${salt}:${password}`)}`;
}

async function passwordMatches(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  return (await sha256Hex(`${salt}:${password}`)) === digest;
}

function validPassword(raw: string) {
  const password = raw.trim();
  if (password.length < 4) throw new Error("Password must be at least 4 characters");
  if (password.length > 72) throw new Error("Password is too long");
  return password;
}

/** Tells the sign-in screen whether this number already has an account with a password. */
export const lookupPhone = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => ({ phone: normalizePhone(input.phone) }))
  .handler(async ({ data }): Promise<{ registered: boolean }> => {
    const db = await admin();
    const { data: row, error } = await db
      .from("emergency_cards")
      .select("card_id, password_hash")
      .eq("phone", data.phone)
      .maybeSingle();
    if (error) throw new Error("Could not check this number right now");
    return { registered: !!row && !!row.password_hash };
  });

/**
 * Phone + password sign-in. A new number creates the card and stores the password;
 * an existing number must match the saved password. Legacy cards with no password
 * yet adopt the password entered on this first sign-in.
 */
export const signInWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; password: string }) => ({
    phone: normalizePhone(input.phone),
    password: validPassword(input.password),
  }))
  .handler(async ({ data }): Promise<Profile> => {
    const db = await admin();
    const existing = await db
      .from("emergency_cards")
      .select(`${COLUMNS}, password_hash`)
      .eq("phone", data.phone)
      .maybeSingle();
    if (existing.error) throw new Error("Could not sign you in right now");

    if (existing.data) {
      const row = existing.data as Row & { password_hash: string | null };
      if (row.password_hash) {
        if (!(await passwordMatches(data.password, row.password_hash))) {
          throw new Error("Wrong password for this number");
        }
      } else {
        const { error } = await db
          .from("emergency_cards")
          .update({ password_hash: await hashPassword(data.password) })
          .eq("card_id", row.card_id);
        if (error) throw new Error("Could not save your password");
      }
      return toProfile(row);
    }

    const row = await createCardRow(db, {
      phone: data.phone,
      holderName: "",
      managedByCardId: null,
    });
    const { error } = await db
      .from("emergency_cards")
      .update({ password_hash: await hashPassword(data.password) })
      .eq("card_id", row.card_id);
    if (error) throw new Error("Could not save your password");
    return toProfile(row);
  });

/** Lets a signed-in owner change their password (current password required). */
export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; current: string; next: string }) => ({
    ...input,
    next: validPassword(input.next),
  }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: stored } = await db
      .from("emergency_cards")
      .select("password_hash")
      .eq("card_id", row.card_id)
      .maybeSingle();
    const hash = stored?.password_hash ?? "";
    if (hash && !(await passwordMatches(data.current, hash))) {
      throw new Error("Current password is wrong");
    }
    const { error } = await db
      .from("emergency_cards")
      .update({ password_hash: await hashPassword(data.next) })
      .eq("card_id", row.card_id);
    if (error) throw new Error("Could not change your password");
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; targetCardId?: string }) => input)
  .handler(async ({ data }): Promise<Profile> => {
    const { row } = await requireAccess(data.cardId, data.phone, data.targetCardId ?? data.cardId);
    return toProfile(row);
  });

export type ProfileInput = {
  cardId: string;
  phone: string;
  targetCardId?: string;
  name: string;
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  contacts: Contact[];
};

export const saveMyProfile = createServerFn({ method: "POST" })
  .inputValidator((input: ProfileInput) => {
    const name = input.name.trim();
    if (!name || name.length > 100) throw new Error("Enter a valid name");
    if (!bloodGroups.has(input.bloodGroup)) throw new Error("Select a valid blood group");
    const list = (values: string[]) =>
      values
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 20);
    return {
      ...input,
      name,
      allergies: list(input.allergies),
      medications: list(input.medications),
      conditions: list(input.conditions),
      contacts: input.contacts
        .slice(0, 5)
        .map((c) => ({
          id: c.id.slice(0, 40),
          name: c.name.trim().slice(0, 100),
          phone: c.phone.trim().slice(0, 30),
          relation: (c.relation || "Contact").trim().slice(0, 50),
        }))
        .filter((c) => c.name && /^[+()\d\s-]{7,30}$/.test(c.phone)),
    };
  })
  .handler(async ({ data }): Promise<Profile> => {
    const { db, row } = await requireAccess(
      data.cardId,
      data.phone,
      data.targetCardId ?? data.cardId,
    );
    const { data: updated, error } = await db
      .from("emergency_cards")
      .update({
        holder_name: data.name,
        blood_group: data.bloodGroup,
        allergies: data.allergies,
        medications: data.medications,
        conditions: data.conditions,
        contacts: data.contacts,
        updated_at: new Date().toISOString(),
      })
      .eq("card_id", row.card_id)
      .select(COLUMNS)
      .maybeSingle();
    if (error || !updated) throw new Error("Could not save your details");
    return toProfile(updated as Row);
  });

export const listDocuments = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; targetCardId?: string }) => input)
  .handler(async ({ data }): Promise<StoredDoc[]> => {
    const { db, row } = await requireAccess(
      data.cardId,
      data.phone,
      data.targetCardId ?? data.cardId,
    );
    const { data: docs, error } = await db
      .from("health_documents")
      .select("id, name, doc_type, size_bytes, storage_path, created_at")
      .eq("card_id", row.card_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load your documents");
    return Promise.all(
      (docs ?? []).map(async (doc) => {
        const signed = await db.storage
          .from("health-docs")
          .createSignedUrl(doc.storage_path, 60 * 60);
        return {
          id: doc.id,
          name: doc.name,
          docType: doc.doc_type,
          sizeBytes: Number(doc.size_bytes),
          createdAt: doc.created_at,
          url: signed.data?.signedUrl ?? null,
        };
      }),
    );
  });

export const uploadDocument = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      cardId: string;
      phone: string;
      targetCardId?: string;
      name: string;
      docType: string;
      contentType: string;
      dataBase64: string;
    }) => {
      if (!input.name.trim()) throw new Error("Choose a file first");
      if (input.dataBase64.length > 14_000_000) throw new Error("File is larger than 10 MB");
      return input;
    },
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, row } = await requireAccess(
      data.cardId,
      data.phone,
      data.targetCardId ?? data.cardId,
    );
    const binary = atob(data.dataBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const safeName = data.name.replace(/[^\w.-]+/g, "_").slice(0, 80);
    const path = `${row.card_id}/${Date.now()}-${safeName}`;
    const upload = await db.storage
      .from("health-docs")
      .upload(path, bytes, { contentType: data.contentType || "application/octet-stream" });
    if (upload.error) throw new Error("Could not upload this file");
    const { error } = await db.from("health_documents").insert({
      card_id: row.card_id,
      name: data.name.slice(0, 120),
      doc_type: data.docType.slice(0, 40),
      size_bytes: bytes.length,
      storage_path: path,
    });
    if (error) throw new Error("Could not save this document");
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { cardId: string; phone: string; targetCardId?: string; id: string }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, row } = await requireAccess(
      data.cardId,
      data.phone,
      data.targetCardId ?? data.cardId,
    );
    const { data: doc } = await db
      .from("health_documents")
      .select("id, storage_path")
      .eq("id", data.id)
      .eq("card_id", row.card_id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found");
    await db.storage.from("health-docs").remove([doc.storage_path]);
    const { error } = await db.from("health_documents").delete().eq("id", doc.id);
    if (error) throw new Error("Could not delete this document");
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: docs } = await db
      .from("health_documents")
      .select("storage_path")
      .eq("card_id", row.card_id);
    if (docs?.length) {
      await db.storage.from("health-docs").remove(docs.map((d) => d.storage_path));
    }
    const { error } = await db.from("emergency_cards").delete().eq("card_id", row.card_id);
    if (error) throw new Error("Could not delete your card");
    return { ok: true };
  });
