import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useHelth } from "@/lib/helth-store";
import { useProfileQuery } from "@/lib/use-helth-data";

/** Sends the visitor to onboarding or sign-in until they have a real card session. */
export function useRequireSession() {
  const { state, update } = useHelth();
  const navigate = useNavigate();
  // The store's very first client render still reflects the SSR placeholder
  // (onboarded: false, session: null) before localStorage has been read, so
  // deciding to redirect on that first pass would bounce an already-signed-in
  // visitor back to onboarding on every fresh launch. Waiting one render lets
  // the store finish loading the real value first.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    if (!state.onboarded) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (!state.session) navigate({ to: "/auth" });
  }, [ready, state.onboarded, state.session, navigate]);

  return { state, update, session: state.session };
}

/**
 * Same as useRequireSession, but also holds the visitor on /profile until the
 * minimum required details (name + blood group) are saved. Without this, someone
 * can sign in, back out of onboarding, and land on a blank home/locker/settings
 * screen with an unusable emergency card.
 */
export function useRequireCompleteProfile() {
  const { session, update } = useRequireSession();
  const profileQuery = useProfileQuery(session);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile || pathname === "/profile") return;
    const incomplete = !profile.name.trim() || !profile.bloodGroup;
    if (incomplete) navigate({ to: "/profile" });
  }, [profileQuery.data, pathname, navigate]);

  return { session, update, profileQuery };
}
