import { useEffect, useState } from "react";

export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(check());
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setIsStandalone(check());
    mq.addEventListener?.("change", onChange);
    window.addEventListener("appinstalled", onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
      window.removeEventListener("appinstalled", onChange);
    };
  }, []);

  return isStandalone;
}
