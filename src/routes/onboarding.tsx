import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Check } from "lucide-react";
import { HealthCard } from "@/components/helth/HealthCard";
import { useHelth } from "@/lib/helth-store";
import accidentAsset from "@/assets/onboarding-accident.png.asset.json";
import scanAsset from "@/assets/onboarding-scan.png.asset.json";

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

const SWIPE_THRESHOLD_PX = 40;

const slides: ReactNode[] = [
  <>
    <div className="mx-auto w-full overflow-hidden rounded-3xl bg-muted shadow-sm">
      <img
        src={accidentAsset.url}
        alt="Motorcyclist lying on the road beside a fallen bike after a crash"
        className="h-56 w-full object-contain"
      />
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
        Nobody around you knows your blood group, allergies, or whom to call. You need treatment
        within the first 60 minutes.
      </p>
    </div>
  </>,
  <>
    <div className="mx-auto w-full overflow-hidden rounded-3xl bg-muted shadow-sm">
      <img
        src={scanAsset.url}
        alt="Phone scanning the QR code on a Helth emergency health card"
        className="h-56 w-full object-contain"
      />
    </div>
    <div className="rounded-xl border border-border bg-muted px-4 py-4 text-center text-muted-foreground">
      Scan takes 5 seconds. No app needed. No login. Works on any phone.
    </div>
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">
        One scan. Everything a doctor needs.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Your blood group, allergies, medications and emergency contacts, visible to anyone who finds
        you.
      </p>
    </div>
  </>,
  <>
    <HealthCard cardId="HELTH001" name="Your name" bloodGroup="B-" />
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
        Your card. Your details. Protected.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Set up takes 2 minutes. Your emergency page goes live instantly.
      </p>
    </div>
  </>,
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { update } = useHelth();
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const finish = () => {
    update((s) => ({ ...s, onboarded: true }));
    navigate({ to: "/auth" });
  };

  const goTo = (next: number) => setStep(Math.min(slides.length - 1, Math.max(0, next)));

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    const x = e.touches[0]?.clientX;
    if (x === undefined) return;
    touchDeltaX.current = x - touchStartX.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > SWIPE_THRESHOLD_PX) {
      goTo(touchDeltaX.current < 0 ? step + 1 : step - 1);
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-card px-6 pt-4 pb-8">
      <button onClick={finish} className="self-end text-sm font-semibold text-muted-foreground">
        Skip
      </button>

      <div
        className="flex-1 touch-pan-y overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${(step * 100) / slides.length}%)`,
          }}
        >
          {slides.map((content, i) => (
            <div
              key={i}
              style={{ width: `${100 / slides.length}%` }}
              className="flex shrink-0 flex-col justify-center gap-8 px-0.5 py-6"
            >
              {content}
            </div>
          ))}
        </div>
      </div>

      {/* Modern sliding progress indicator: one track, one moving thumb. */}
      <div className="relative mx-auto mb-6 h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-transform duration-300 ease-out"
          style={{
            width: `${100 / slides.length}%`,
            transform: `translateX(${step * 100}%)`,
          }}
        />
      </div>

      <button
        onClick={() => (step === slides.length - 1 ? finish() : goTo(step + 1))}
        className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground active:opacity-90"
      >
        {step === slides.length - 1 ? "Get Started" : "Continue"}
      </button>
    </div>
  );
}
