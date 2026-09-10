import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ScanLine, Bike } from "lucide-react";
import { HealthCard } from "@/components/helth/HealthCard";
import { useHelth, activeMember } from "@/lib/helth-store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Helth" },
      {
        name: "description",
        content: "Set up your Helth emergency health card in two minutes.",
      },
      { property: "og:title", content: "Get started — Helth" },
      {
        property: "og:description",
        content: "Set up your Helth emergency health card in two minutes.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { state, update } = useHelth();
  const member = activeMember(state);

  const finish = () => {
    update((s) => ({ ...s, onboarded: true }));
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card px-6 pt-4 pb-8">
      <button onClick={finish} className="self-end text-sm font-semibold text-muted-foreground">
        Skip
      </button>

      <div className="flex flex-1 flex-col justify-center gap-8 py-6">
        {step === 0 && (
          <>
            <div className="flex items-center justify-center rounded-3xl bg-muted py-12">
              <Bike className="size-28 text-muted-foreground" strokeWidth={1.2} />
            </div>
            <div className="rounded-xl border border-primary/25 bg-accent px-4 py-4 text-center">
              <p className="text-sm font-bold text-primary">ACCIDENT AT JUNCTION</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Rider unconscious. No one knows who to call. Blood group unknown.
              </p>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                What if you're unconscious on the road?
              </h1>
              <p className="mt-3 text-muted-foreground">
                Nobody around you knows your blood group, allergies, or whom to call. You need
                treatment within the first 60 minutes.
              </p>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex items-center justify-center rounded-3xl bg-muted py-12">
              <ScanLine className="size-28 text-muted-foreground" strokeWidth={1.2} />
            </div>
            <div className="rounded-xl border border-border bg-muted px-4 py-4 text-center text-muted-foreground">
              Scan takes 5 seconds. No app needed. No login. Works on any phone.
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                One scan. Everything a doctor needs.
              </h1>
              <p className="mt-3 text-muted-foreground">
                Your blood group, allergies, medications and emergency contacts, visible to anyone
                who finds you.
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <HealthCard member={member} />
            <div className="space-y-3">
              {["Emergency Health Card", "AI Summary Of Your Health"].map((t) => (
                <div key={t} className="flex items-center gap-3 rounded-xl bg-muted px-4 py-4">
                  <Check className="size-5 text-success" strokeWidth={3} />
                  <span className="font-bold">{t}</span>
                </div>
              ))}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Your card. Your family. Protected.
              </h1>
              <p className="mt-3 text-muted-foreground">
                Set up takes 2 minutes. Your emergency page goes live instantly.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mb-6 flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-8 bg-primary" : "w-8 bg-muted"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => (step === 2 ? finish() : setStep(step + 1))}
        className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground active:opacity-90"
      >
        {step === 2 ? "Get Started" : "Continue"}
      </button>
    </div>
  );
}
