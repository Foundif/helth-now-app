import { useCallback, useSyncExternalStore } from "react";

export type Contact = { id: string; name: string; phone: string; relation: string };
export type HealthDoc = {
  id: string;
  name: string;
  type: "Lab Report" | "Prescription" | "Other";
  size: string;
  date: string;
  memberId: string;
};
export type Member = {
  id: string;
  name: string;
  emoji: string;
  cardId: string;
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  contacts: Contact[];
};

export type HelthState = {
  onboarded: boolean;
  activeMemberId: string;
  members: Member[];
  documents: HealthDoc[];
  insuranceActivated: boolean;
  editToken: string;
};

const KEY = "helth-state-v1";

const defaultState: HelthState = {
  onboarded: false,
  activeMemberId: "m1",
  members: [
    {
      id: "m1",
      name: "Purvam Joshi",
      emoji: "👨",
      cardId: "ETH0001",
      bloodGroup: "B-",
      allergies: ["Penicillin"],
      medications: ["Metformin 500mg"],
      conditions: ["Type 2 Diabetes"],
      contacts: [
        { id: "c1", name: "Janak Joshi", phone: "+91 98795 65035", relation: "Father" },
        { id: "c2", name: "Vasu Chashmawala", phone: "+91 94093 49274", relation: "Friend" },
      ],
    },
    {
      id: "m2",
      name: "Priya Joshi",
      emoji: "👩",
      cardId: "ETH0002",
      bloodGroup: "A+",
      allergies: [],
      medications: [],
      conditions: [],
      contacts: [{ id: "c3", name: "Purvam Joshi", phone: "+91 98795 65035", relation: "Brother" }],
    },
  ],
  documents: [
    {
      id: "d1",
      name: "blood-report.pdf",
      type: "Lab Report",
      size: "1.2 MB",
      date: "22 Mar 2026",
      memberId: "m1",
    },
  ],
  insuranceActivated: false,
  editToken: "",
};

let state: HelthState = defaultState;
let hydrated = false;
const listeners = new Set<() => void>();

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function load(): HelthState {
  if (typeof window === "undefined") return defaultState;
  let loaded = defaultState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) loaded = { ...defaultState, ...(JSON.parse(raw) as HelthState) };
  } catch {
    loaded = defaultState;
  }
  if (!loaded.editToken) {
    loaded = { ...loaded, editToken: newToken() };
    window.localStorage.setItem(KEY, JSON.stringify(loaded));
  }
  return loaded;
}

function emit() {
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

export function setState(updater: (prev: HelthState) => HelthState) {
  state = updater(state);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
  emit();
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

const fallbackMember: Member = {
  id: "m1",
  name: "New member",
  emoji: "🧑",
  cardId: "ETH0001",
  bloodGroup: "O+",
  allergies: [],
  medications: [],
  conditions: [],
  contacts: [],
};

export function activeMember(s: HelthState): Member {
  return s.members.find((m) => m.id === s.activeMemberId) ?? s.members[0] ?? fallbackMember;
}

export function memberByCard(s: HelthState, cardId: string): Member | undefined {
  return s.members.find((m) => m.cardId.toLowerCase() === cardId.toLowerCase());
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function profileCompletion(m: Member, insurance: boolean, docs: number) {
  const checks = [
    m.bloodGroup !== "",
    m.contacts.length > 0,
    m.medications.length > 0,
    m.allergies.length > 0 || m.conditions.length > 0,
    insurance,
    docs > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
