import { Link } from "@tanstack/react-router";
import { Home, BookMarked, ScanLine, Users, Droplet, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/locker", label: "Locker", icon: BookMarked },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/family", label: "Family", icon: Users },
  { to: "/blood", label: "Blood", icon: Droplet },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-primary/45"
          activeProps={{ className: "!text-primary" }}
        >
          <Icon className="size-5" strokeWidth={2} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
