import { useCallback, useSyncExternalStore } from "react";

export type Session = { cardId: string; phone: string } | null;

export type AppState = {
  onboarded: boolean;
  session: Session;
};

const KEY = "helth-app-v2";

const defaultState: AppState = { onboarded: false, session: null };

let state: AppState = defaultState;
let hydrated = false;
const listeners = new Set<() => void>();

function load(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...defaultState, ...(JSON.parse(raw) as AppState) };
  } catch {
    return defaultState;
  }
  return defaultState;
}

export function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  if (!hydrated) {
    hydrated = true;
    state = load();
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useHelth() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => defaultState,
  );
  const update = useCallback(setState, []);
  return { state: snapshot, update };
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function profileCompletion(
  p: {
    name: string;
    bloodGroup: string;
    allergies: string[];
    medications: string[];
    conditions: string[];
    contacts: unknown[];
  },
  docs: number,
) {
  const checks = [
    p.name !== "",
    p.bloodGroup !== "",
    p.contacts.length > 0,
    p.medications.length > 0,
    p.allergies.length > 0 || p.conditions.length > 0,
    docs > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
