import { createServerFn } from "@tanstack/react-start";
import { requireOwner } from "@/lib/helth.functions";
import { logFamilyAlert } from "@/lib/family.functions";

export const sendSosAlert = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; locationUrl: string | null }) => input)
  .handler(async ({ data }): Promise<{ notifiedFamily: boolean }> => {
    const { row } = await requireOwner(data.cardId, data.phone);
    const message = data.locationUrl
      ? `${row.holder_name || "A family member"} triggered SOS. Location: ${data.locationUrl}`
      : `${row.holder_name || "A family member"} triggered SOS (location unavailable).`;
    const notifiedFamily = await logFamilyAlert(row.card_id, "sos", message);
    return { notifiedFamily };
  });
