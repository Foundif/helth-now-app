import type { Member } from "./helth-store";

export function cardUrl(cardId: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/card/${encodeURIComponent(cardId)}`;
}

export async function shareCard(member: Pick<Member, "name" | "cardId">) {
  const url = cardUrl(member.cardId);
  if (navigator.share) {
    try {
      await navigator.share({ title: `${member.name}'s emergency health card`, text: "Emergency health information", url });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied" as const;
}
