import { useEffect, useState } from "react";
import logoAsset from "@/assets/helth-logo.png.asset.json";

const VISIBLE_MS = 1700;

/** Full-screen logo shown once when the app first loads, then fades and unmounts. */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="helth-splash pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-white"
    >
      <img
        src={logoAsset.url}
        alt=""
        className="h-44 w-44 rounded-[2.5rem] object-contain drop-shadow-xl"
      />
    </div>
  );
}
