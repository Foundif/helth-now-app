import { createServerFn } from "@tanstack/react-start";
import { admin, requireOwner, BLOOD_GROUPS } from "@/lib/helth.functions";

const bloodGroupSet = new Set<string>(BLOOD_GROUPS);

function cleanText(value: string, max: number) {
  return value.trim().slice(0, max);
}

export type DonorStatus = {
  active: boolean;
  bloodGroup: string;
  city: string;
  phone: string;
};

export type Donor = {
  name: string;
  bloodGroup: string;
  city: string;
  phone: string;
  updatedAt: string;
};

export type BloodRequestItem = {
  id: string;
  requesterName: string;
  bloodGroup: string;
  city: string;
  hospital: string;
  notes: string;
  status: "open" | "fulfilled" | "cancelled";
  createdAt: string;
  isMine: boolean;
};

/** Fetch the caller's own donor opt-in row, if any (drives the toggle UI). */
export const getDonorStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<DonorStatus | null> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: donor, error } = await db
      .from("blood_donors")
      .select("active, blood_group, city, phone")
      .eq("card_id", row.card_id)
      .maybeSingle();
    if (error) throw new Error("Could not check donor status right now");
    if (!donor) return null;
    return {
      active: donor.active,
      bloodGroup: donor.blood_group,
      city: donor.city,
      phone: donor.phone,
    };
  });

/** Opt in (or update details) as a blood donor. */
export const setDonorStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      cardId: string;
      phone: string;
      bloodGroup: string;
      city: string;
      donorPhone: string;
    }) => {
      if (!bloodGroupSet.has(input.bloodGroup)) throw new Error("Select a valid blood group");
      const city = cleanText(input.city, 60);
      if (!city) throw new Error("Enter your city");
      const donorPhone = cleanText(input.donorPhone, 30);
      if (!/^[+()\d\s-]{7,30}$/.test(donorPhone)) throw new Error("Enter a valid contact number");
      return {
        cardId: input.cardId,
        phone: input.phone,
        bloodGroup: input.bloodGroup,
        city,
        donorPhone,
      };
    },
  )
  .handler(async ({ data }): Promise<DonorStatus> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { error } = await db.from("blood_donors").upsert({
      card_id: row.card_id,
      name: row.holder_name || "Helth user",
      blood_group: data.bloodGroup,
      city: data.city,
      phone: data.donorPhone,
      active: true,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("Could not save donor details");
    return { active: true, bloodGroup: data.bloodGroup, city: data.city, phone: data.donorPhone };
  });

/** Opt out of the donor directory. */
export const setDonorInactive = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { error } = await db
      .from("blood_donors")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("card_id", row.card_id);
    if (error) throw new Error("Could not update donor status");
  });

/** Search active donors by blood group (any signed-in Helth account may search). */
export const searchDonors = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; bloodGroup: string; city?: string }) => {
    if (!bloodGroupSet.has(input.bloodGroup)) throw new Error("Select a valid blood group");
    return input;
  })
  .handler(async ({ data }): Promise<Donor[]> => {
    const { db } = await requireOwner(data.cardId, data.phone);
    let query = db
      .from("blood_donors")
      .select("name, blood_group, city, phone, updated_at")
      .eq("blood_group", data.bloodGroup)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data.city?.trim()) query = query.ilike("city", `%${data.city.trim()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not search donors right now");
    return (rows ?? []).map((d) => ({
      name: d.name,
      bloodGroup: d.blood_group,
      city: d.city,
      phone: d.phone,
      updatedAt: d.updated_at,
    }));
  });

/** Post an urgent blood request, visible to signed-in Helth users searching that blood group. */
export const createBloodRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      cardId: string;
      phone: string;
      bloodGroup: string;
      city: string;
      hospital: string;
      notes: string;
    }) => {
      if (!bloodGroupSet.has(input.bloodGroup)) throw new Error("Select a valid blood group");
      const city = cleanText(input.city, 60);
      if (!city) throw new Error("Enter a city");
      return {
        cardId: input.cardId,
        phone: input.phone,
        bloodGroup: input.bloodGroup,
        city,
        hospital: cleanText(input.hospital, 100),
        notes: cleanText(input.notes, 300),
      };
    },
  )
  .handler(async ({ data }): Promise<BloodRequestItem> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: inserted, error } = await db
      .from("blood_requests")
      .insert({
        card_id: row.card_id,
        requester_name: row.holder_name || "Helth user",
        blood_group: data.bloodGroup,
        city: data.city,
        hospital: data.hospital,
        notes: data.notes,
      })
      .select("id, requester_name, blood_group, city, hospital, notes, status, created_at")
      .single();
    if (error || !inserted) throw new Error("Could not create the request");
    return {
      id: inserted.id,
      requesterName: inserted.requester_name,
      bloodGroup: inserted.blood_group,
      city: inserted.city,
      hospital: inserted.hospital ?? "",
      notes: inserted.notes ?? "",
      status: inserted.status as BloodRequestItem["status"],
      createdAt: inserted.created_at,
      isMine: true,
    };
  });

/** List open blood requests, most recent first, optionally filtered by blood group. */
export const listBloodRequests = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; bloodGroup?: string }) => input)
  .handler(async ({ data }): Promise<BloodRequestItem[]> => {
    const { row } = await requireOwner(data.cardId, data.phone);
    const db = await admin();
    let query = db
      .from("blood_requests")
      .select("id, card_id, requester_name, blood_group, city, hospital, notes, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.bloodGroup && bloodGroupSet.has(data.bloodGroup)) {
      query = query.eq("blood_group", data.bloodGroup);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load requests right now");
    return (rows ?? []).map((r) => ({
      id: r.id,
      requesterName: r.requester_name,
      bloodGroup: r.blood_group,
      city: r.city,
      hospital: r.hospital ?? "",
      notes: r.notes ?? "",
      status: r.status as BloodRequestItem["status"],
      createdAt: r.created_at,
      isMine: r.card_id === row.card_id,
    }));
  });

/** Mark the caller's own request as fulfilled or cancelled. */
export const closeBloodRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      cardId: string;
      phone: string;
      requestId: string;
      status: "fulfilled" | "cancelled";
    }) => input,
  )
  .handler(async ({ data }): Promise<void> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { error } = await db
      .from("blood_requests")
      .update({ status: data.status })
      .eq("id", data.requestId)
      .eq("card_id", row.card_id);
    if (error) throw new Error("Could not update the request");
  });
