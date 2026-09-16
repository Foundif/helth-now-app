import { createServerFn } from "@tanstack/react-start";
import { requireOwner } from "@/lib/helth.functions";

function cleanText(value: string, max: number) {
  return value.trim().slice(0, max);
}

export type Hospital = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
};

export const listHospitals = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<Hospital[]> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: rows, error } = await db
      .from("saved_hospitals")
      .select("id, name, phone, address, notes, created_at")
      .eq("card_id", row.card_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load saved hospitals");
    return (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  });

export const addHospital = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      cardId: string;
      phone: string;
      name: string;
      hospitalPhone: string;
      address: string;
      notes: string;
    }) => {
      const name = cleanText(input.name, 100);
      if (!name) throw new Error("Enter the hospital's name");
      return {
        cardId: input.cardId,
        phone: input.phone,
        name,
        hospitalPhone: cleanText(input.hospitalPhone, 30),
        address: cleanText(input.address, 200),
        notes: cleanText(input.notes, 200),
      };
    },
  )
  .handler(async ({ data }): Promise<Hospital> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: inserted, error } = await db
      .from("saved_hospitals")
      .insert({
        card_id: row.card_id,
        name: data.name,
        phone: data.hospitalPhone,
        address: data.address,
        notes: data.notes,
      })
      .select("id, name, phone, address, notes, created_at")
      .single();
    if (error || !inserted) throw new Error("Could not save this hospital");
    return {
      id: inserted.id,
      name: inserted.name,
      phone: inserted.phone,
      address: inserted.address,
      notes: inserted.notes,
      createdAt: inserted.created_at,
    };
  });

export const deleteHospital = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; id: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { error } = await db
      .from("saved_hospitals")
      .delete()
      .eq("id", data.id)
      .eq("card_id", row.card_id);
    if (error) throw new Error("Could not remove this hospital");
  });
