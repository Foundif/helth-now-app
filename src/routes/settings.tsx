import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { IdCard, Package, UserPen, Smartphone, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/helth/BottomNav";
import { useHelth, activeMember } from "@/lib/helth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Helth" },
      {
        name: "description",
        content: "Link a card, order a physical card and manage your Helth profile.",
      },
      { property: "og:title", content: "Settings — Helth" },
      {
        property: "og:description",
        content: "Link a card, order a physical card and manage your Helth profile.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, update } = useHelth();
  const member = activeMember(state);
  const navigate = useNavigate();

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <header className="bg-ink px-5 pt-6 pb-6 text-ink-foreground">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <div className="mt-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-success/25 text-3xl ring-2 ring-success">
            {member.emoji}
          </span>
          <p className="mt-1 text-sm font-bold">{member.name.split(" ")[0]}</p>
        </div>
      </header>

      <main className="space-y-6 px-5 py-5">
        <section>
          <p className="mb-2 text-sm font-bold text-muted-foreground">Card</p>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            <Row
              icon={<IdCard className="size-5 text-primary" />}
              title="Link a card"
              sub="Link your card or a family member's"
              onClick={() => toast.success(`Card ${member.cardId} is already linked`)}
            />
            <Row
              icon={<Package className="size-5 text-primary" />}
              title="Order Physical Card"
              sub="Standard · Free delivery"
              onClick={() => toast.success("Physical card ordered · arrives in 5 days")}
            />
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-bold text-muted-foreground">Profile</p>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Link to="/profile" className="block">
              <Row
                icon={<UserPen className="size-5 text-primary" />}
                title="Edit Profile"
                sub="Update your medical details"
              />
            </Link>
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-bold text-muted-foreground">App Settings</p>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Row
              icon={<Smartphone className="size-5 text-primary" />}
              title="About App"
              sub="Privacy policy, terms of use"
              onClick={() => toast("Helth prototype · v1.0")}
            />
          </div>
        </section>

        <div className="space-y-3">
          <button
            onClick={() => {
              update((s) => ({ ...s, onboarded: false }));
              navigate({ to: "/onboarding" });
            }}
            className="w-full rounded-xl border border-border bg-card py-4 font-bold text-primary"
          >
            Logout
          </button>
          <button
            onClick={() => toast.error("Account deletion is disabled in this prototype")}
            className="w-full rounded-xl border border-border bg-card py-4 font-bold text-primary"
          >
            Delete Account
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function Row({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left"
    >
      <span className="rounded-lg bg-muted p-2">{icon}</span>
      <span className="flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </div>
  );
}
