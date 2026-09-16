import { createServerFn } from "@tanstack/react-start";
import { admin, requireOwner } from "@/lib/helth.functions";

export type FamilyMember = {
  memberRowId: string;
  cardId: string;
  name: string;
  bloodGroup: string;
  allergyCount: number;
  medicationCount: number;
  relation: string;
  status: "pending" | "accepted";
  isMe: boolean;
  updatedAt: string;
};

export type IncomingInvite = {
  memberRowId: string;
  circleId: string;
  circleName: string;
  fromName: string;
  fromCardId: string;
  createdAt: string;
};

export type FamilyState = {
  circleId: string | null;
  circleName: string | null;
  members: FamilyMember[];
  incomingInvites: IncomingInvite[];
};

export type FamilyAlertItem = {
  id: string;
  cardId: string;
  holderName: string;
  type: "scan" | "sos" | "checkin_missed";
  message: string;
  createdAt: string;
};

/** Writes a family alert for this card's circle, if it has one. Silently no-ops otherwise. */
export async function logFamilyAlert(
  cardId: string,
  type: FamilyAlertItem["type"],
  message: string,
) {
  const db = await admin();
  const { data: membership } = await db
    .from("family_members")
    .select("circle_id")
    .eq("card_id", cardId)
    .eq("status", "accepted")
    .maybeSingle();
  if (!membership) return;
  await db.from("family_alerts").insert({
    circle_id: membership.circle_id,
    card_id: cardId,
    type,
    message,
  });
}

async function getOwnCircleId(cardId: string) {
  const db = await admin();
  const { data } = await db
    .from("family_members")
    .select("circle_id")
    .eq("card_id", cardId)
    .eq("status", "accepted")
    .maybeSingle();
  return data?.circle_id ?? null;
}

async function loadFamilyState(cardId: string): Promise<FamilyState> {
  const db = await admin();
  const circleId = await getOwnCircleId(cardId);

  const incomingRows = await db
    .from("family_members")
    .select("id, circle_id, invited_by_card_id, created_at, family_circles(name)")
    .eq("card_id", cardId)
    .eq("status", "pending");

  const inviterIds = [...new Set((incomingRows.data ?? []).map((r) => r.invited_by_card_id))];
  const invitersById = new Map<string, string>();
  if (inviterIds.length) {
    const { data: inviters } = await db
      .from("emergency_cards")
      .select("card_id, holder_name")
      .in("card_id", inviterIds);
    for (const p of inviters ?? []) invitersById.set(p.card_id, p.holder_name || "A Helth user");
  }

  const incomingInvites: IncomingInvite[] = (incomingRows.data ?? []).map((r) => ({
    memberRowId: r.id,
    circleId: r.circle_id,
    circleName: (r.family_circles as { name: string } | null)?.name ?? "Family",
    fromName: invitersById.get(r.invited_by_card_id) ?? "A Helth user",
    fromCardId: r.invited_by_card_id,
    createdAt: r.created_at,
  }));

  if (!circleId) return { circleId: null, circleName: null, members: [], incomingInvites };

  const { data: circle } = await db
    .from("family_circles")
    .select("name")
    .eq("id", circleId)
    .single();

  const { data: memberRows } = await db
    .from("family_members")
    .select(
      "id, card_id, relation, status, created_at, emergency_cards(holder_name, blood_group, allergies, medications, updated_at)",
    )
    .eq("circle_id", circleId)
    .in("status", ["accepted", "pending"]);

  const members: FamilyMember[] = (memberRows ?? []).map((r) => {
    const c = r.emergency_cards as {
      holder_name: string;
      blood_group: string;
      allergies: unknown;
      medications: unknown;
      updated_at: string;
    } | null;
    return {
      memberRowId: r.id,
      cardId: r.card_id,
      name: c?.holder_name || "Helth user",
      bloodGroup: c?.blood_group ?? "",
      allergyCount: Array.isArray(c?.allergies) ? c.allergies.length : 0,
      medicationCount: Array.isArray(c?.medications) ? c.medications.length : 0,
      relation: r.relation,
      status: r.status as "pending" | "accepted",
      isMe: r.card_id === cardId,
      updatedAt: c?.updated_at ?? r.created_at,
    };
  });

  return { circleId, circleName: circle?.name ?? "Family", members, incomingInvites };
}

export const getFamilyState = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<FamilyState> => {
    const { row } = await requireOwner(data.cardId, data.phone);
    return loadFamilyState(row.card_id);
  });

/** Invite another existing Helth card into the caller's family circle (creating one if needed). */
export const inviteFamilyMember = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { cardId: string; phone: string; targetCardId: string; relation: string }) => ({
      cardId: input.cardId,
      phone: input.phone,
      targetCardId: input.targetCardId.trim().toUpperCase(),
      relation: input.relation.trim().slice(0, 40),
    }),
  )
  .handler(async ({ data }): Promise<FamilyState> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    if (!data.targetCardId) throw new Error("Enter the family member's card ID");
    if (data.targetCardId === row.card_id) throw new Error("You can't invite your own card");

    const { data: target } = await db
      .from("emergency_cards")
      .select("card_id")
      .eq("card_id", data.targetCardId)
      .maybeSingle();
    if (!target) throw new Error("No Helth card found with that ID");

    const { data: existing } = await db
      .from("family_members")
      .select("status")
      .eq("card_id", data.targetCardId)
      .in("status", ["accepted", "pending"])
      .maybeSingle();
    if (existing) {
      throw new Error(
        existing.status === "accepted"
          ? "That card is already in a family circle"
          : "That card already has a pending family invite",
      );
    }

    let circleId = await getOwnCircleId(row.card_id);
    if (!circleId) {
      const { data: circle, error: circleError } = await db
        .from("family_circles")
        .insert({ name: `${row.holder_name || "My"}'s Family` })
        .select("id")
        .single();
      if (circleError || !circle) throw new Error("Could not create family circle");
      circleId = circle.id;
      await db.from("family_members").insert({
        circle_id: circleId,
        card_id: row.card_id,
        relation: "Me",
        status: "accepted",
        invited_by_card_id: row.card_id,
        responded_at: new Date().toISOString(),
      });
    }

    const { error } = await db.from("family_members").insert({
      circle_id: circleId,
      card_id: data.targetCardId,
      relation: data.relation,
      status: "pending",
      invited_by_card_id: row.card_id,
    });
    if (error) throw new Error("Could not send the invite");

    return loadFamilyState(row.card_id);
  });

/** Accept or decline an incoming family invite addressed to the caller's own card. */
export const respondToFamilyInvite = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { cardId: string; phone: string; memberRowId: string; accept: boolean }) => input,
  )
  .handler(async ({ data }): Promise<FamilyState> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: invite } = await db
      .from("family_members")
      .select("id, card_id, circle_id, status")
      .eq("id", data.memberRowId)
      .maybeSingle();
    if (!invite || invite.card_id !== row.card_id || invite.status !== "pending") {
      throw new Error("This invite is no longer available");
    }
    if (data.accept) {
      const existingCircle = await getOwnCircleId(row.card_id);
      if (existingCircle && existingCircle !== invite.circle_id) {
        throw new Error("You're already in a different family circle — leave it first");
      }
    }
    const { error } = await db
      .from("family_members")
      .update({
        status: data.accept ? "accepted" : "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", data.memberRowId);
    if (error) throw new Error("Could not update the invite");
    return loadFamilyState(row.card_id);
  });

/** Leave the caller's family circle. Cleans up the circle if no accepted members remain. */
export const leaveFamilyCircle = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<FamilyState> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const circleId = await getOwnCircleId(row.card_id);
    if (circleId) {
      await db.from("family_members").delete().eq("circle_id", circleId).eq("card_id", row.card_id);
      const { count } = await db
        .from("family_members")
        .select("id", { count: "exact", head: true })
        .eq("circle_id", circleId)
        .eq("status", "accepted");
      if (!count) {
        await db.from("family_members").delete().eq("circle_id", circleId);
        await db.from("family_circles").delete().eq("id", circleId);
      }
    }
    return loadFamilyState(row.card_id);
  });

/** Recent alerts (card scanned, SOS, missed check-in) for the caller's family circle. */
export const listFamilyAlerts = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string }) => input)
  .handler(async ({ data }): Promise<FamilyAlertItem[]> => {
    const { db, row } = await requireOwner(data.cardId, data.phone);
    const circleId = await getOwnCircleId(row.card_id);
    if (!circleId) return [];
    const { data: alerts, error } = await db
      .from("family_alerts")
      .select("id, card_id, type, message, created_at, emergency_cards(holder_name)")
      .eq("circle_id", circleId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error("Could not load family alerts");
    return (alerts ?? []).map((a) => ({
      id: a.id,
      cardId: a.card_id,
      holderName:
        (a.emergency_cards as { holder_name: string } | null)?.holder_name || "A family member",
      type: a.type as FamilyAlertItem["type"],
      message: a.message,
      createdAt: a.created_at,
    }));
  });
