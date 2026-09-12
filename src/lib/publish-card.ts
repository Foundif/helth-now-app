import { useEffect, useRef } from "react";
import type { Member } from "./helth-store";
import { saveEmergencyCard } from "./emergency-card.functions";

/** Keeps the publicly scannable emergency record in sync with the local profile. */
export function usePublishCards(members: Member[], editToken: string) {
  const lastRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!editToken) return;
    const timer = setTimeout(() => {
      members.forEach((member) => {
        const payload = {
          cardId: member.cardId,
          holderName: member.name,
          bloodGroup: member.bloodGroup,
          allergies: member.allergies,
          medications: member.medications,
          conditions: member.conditions,
          contacts: member.contacts,
          editToken,
        };
        const fingerprint = JSON.stringify(payload);
        if (lastRef.current[member.cardId] === fingerprint) return;
        lastRef.current[member.cardId] = fingerprint;
        saveEmergencyCard({ data: payload }).catch((error: unknown) => {
          delete lastRef.current[member.cardId];
          console.error("Failed to publish emergency card", error);
        });
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [members, editToken]);
}
