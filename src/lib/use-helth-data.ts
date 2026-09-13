import { useQuery } from "@tanstack/react-query";
import { getMyProfile, listDocuments } from "@/lib/helth.functions";
import type { Session } from "@/lib/helth-store";

export function useProfileQuery(session: Session) {
  return useQuery({
    queryKey: ["profile", session?.cardId],
    enabled: Boolean(session),
    retry: 1,
    queryFn: () =>
      getMyProfile({ data: { cardId: session!.cardId, phone: session!.phone } }),
  });
}

export function useDocumentsQuery(session: Session) {
  return useQuery({
    queryKey: ["documents", session?.cardId],
    enabled: Boolean(session),
    retry: 1,
    queryFn: () =>
      listDocuments({ data: { cardId: session!.cardId, phone: session!.phone } }),
  });
}
