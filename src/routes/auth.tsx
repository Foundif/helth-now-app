import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { signInWithPhone } from "@/lib/helth.functions";
import { useHelth } from "@/lib/helth-store";
import logoAsset from "@/assets/helth-logo.png.asset.json";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Helth" },
      {
        name: "description",
        content: "Enter your phone number to get your Helth emergency card ID.",
      },
      { property: "og:title", content: "Sign in — Helth" },
      {
        property: "og:description",
        content: "Enter your phone number to get your Helth emergency card ID.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { state, update } = useHelth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.session) navigate({ to: "/" });
  }, [state.session, navigate]);

  const submit = async () => {
    setBusy(true);
    try {
      const profile = await signInWithPhone({ data: { phone } });
      update((s) => ({
        ...s,
        onboarded: true,
        session: { cardId: profile.cardId, phone: profile.phone },
      }));
      toast.success(`Signed in · your card ID is ${profile.cardId}`);
      navigate({ to: profile.name ? "/" : "/profile" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-card px-6 py-10">
      <span className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-ink">
        <img src={logoAsset.url} alt="Helth" className="h-full w-full object-cover" />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Enter your phone number</h1>
      <p className="mt-2 text-muted-foreground">
        We create your unique emergency card ID (like HELTH001) and keep your details linked to this
        number.
      </p>

      <label className="mt-8 text-sm font-bold" htmlFor="phone">
        Phone number
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
        <Phone className="size-4 text-muted-foreground" />
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && phone && void submit()}
          placeholder="+91 98765 43210"
          className="flex-1 bg-transparent outline-none"
        />
      </div>

      <button
        onClick={() => void submit()}
        disabled={busy || phone.replace(/\D/g, "").length < 8}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />} Continue
      </button>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your number is never shown to anyone who scans your card.
      </p>
    </div>
  );
}
