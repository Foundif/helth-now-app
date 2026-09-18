import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Phone } from "lucide-react";
import { lookupPhone, signInWithPhone } from "@/lib/helth.functions";
import { useHelth } from "@/lib/helth-store";
import { vibrate } from "@/lib/alarm-sound";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Helth" },
      {
        name: "description",
        content: "Enter your phone number and password to open your Helth emergency card.",
      },
      { property: "og:title", content: "Sign in — Helth" },
      {
        property: "og:description",
        content: "Enter your phone number and password to open your Helth emergency card.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { state, update } = useHelth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [step, setStep] = useState<"phone" | "password">("phone");
  const [registered, setRegistered] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.session) navigate({ to: "/" });
  }, [state.session, navigate]);

  const checkPhone = async () => {
    setBusy(true);
    try {
      const { registered: exists } = await lookupPhone({ data: { phone } });
      setRegistered(exists);
      setStep("password");
      vibrate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.phoneError"));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!registered && password !== confirm) {
      toast.error(t("auth.mismatch"));
      return;
    }
    setBusy(true);
    try {
      const profile = await signInWithPhone({ data: { phone, password } });
      update((s) => ({
        ...s,
        onboarded: true,
        session: { cardId: profile.cardId, phone: profile.phone },
      }));
      vibrate([60, 40, 60]);
      toast.success(t("auth.signedIn", { cardId: profile.cardId }));
      navigate({ to: profile.name ? "/" : "/profile" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.signInError"));
    } finally {
      setBusy(false);
    }
  };

  const phoneReady = phone.replace(/\D/g, "").length >= 8;
  const passwordReady = password.trim().length >= 4 && (registered || confirm.trim().length >= 4);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-card px-6 py-10">
      <span className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-ink">
        <img src="/icon-512.png" alt="Helth" className="h-full w-full object-cover" />
      </span>

      {step === "phone" ? (
        <>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{t("auth.phoneTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("auth.phoneHint")}</p>

          <label className="mt-8 text-sm font-bold" htmlFor="phone">
            {t("auth.phoneLabel")}
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
            <Phone className="size-4 text-muted-foreground" />
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && phoneReady && void checkPhone()}
              placeholder="+91 98765 43210"
              className="flex-1 bg-transparent outline-none"
            />
          </div>

          <button
            onClick={() => void checkPhone()}
            disabled={busy || !phoneReady}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />} {t("auth.continue")}
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">{t("auth.privateNote")}</p>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
            {registered ? t("auth.enterPassword") : t("auth.createPassword")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {registered ? t("auth.enterPasswordHint") : t("auth.createPasswordHint")}
          </p>
          <p className="mt-3 text-sm font-bold">{phone}</p>

          <label className="mt-6 text-sm font-bold" htmlFor="password">
            {t("auth.passwordLabel")}
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
            <KeyRound className="size-4 text-muted-foreground" />
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete={registered ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && passwordReady && void submit()}
              placeholder="••••••"
              className="flex-1 bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {show ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {!registered && (
            <>
              <label className="mt-4 text-sm font-bold" htmlFor="confirm">
                {t("auth.confirmLabel")}
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
                <KeyRound className="size-4 text-muted-foreground" />
                <input
                  id="confirm"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && passwordReady && void submit()}
                  placeholder="••••••"
                  className="flex-1 bg-transparent outline-none"
                />
              </div>
            </>
          )}

          <button
            onClick={() => void submit()}
            disabled={busy || !passwordReady}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}{" "}
            {registered ? t("auth.login") : t("auth.createAccount")}
          </button>
          <button
            onClick={() => {
              setStep("phone");
              setPassword("");
              setConfirm("");
            }}
            className="mt-3 w-full py-2 text-sm font-bold text-muted-foreground"
          >
            {t("auth.changeNumber")}
          </button>
        </>
      )}
    </div>
  );
}
