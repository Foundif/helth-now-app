import { Link } from "@tanstack/react-router";
import { Home, BookMarked, ScanLine, Users, Droplet, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const items = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/locker", labelKey: "nav.locker", icon: BookMarked },
  { to: "/scan", labelKey: "nav.scan", icon: ScanLine },
  { to: "/family", labelKey: "nav.family", icon: Users },
  { to: "/blood", labelKey: "nav.blood", icon: Droplet },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      {items.map(({ to, labelKey, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-primary/45"
          activeProps={{ className: "!text-primary" }}
        >
          <Icon className="size-5" strokeWidth={2} />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
