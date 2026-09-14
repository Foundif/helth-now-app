import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHelth } from "@/lib/helth-store";

/** Sends the visitor to onboarding or sign-in until they have a real card session. */
export function useRequireSession() {
  const { state, update } = useHelth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.onboarded) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (!state.session) navigate({ to: "/auth" });
  }, [state.onboarded, state.session, navigate]);

  return { state, update, session: state.session };
}
