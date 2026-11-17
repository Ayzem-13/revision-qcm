import { useEffect, type CSSProperties } from "react";

export function useSeedHue(hue: number | null): void {
  useEffect(() => {
    const root = document.documentElement;
    if (hue === null) {
      root.style.removeProperty("--hue");
      return;
    }
    root.style.setProperty("--hue", String(hue));
    return () => {
      root.style.removeProperty("--hue");
    };
  }, [hue]);
}

export function hueScope(hue: number): { readonly "data-hue": ""; readonly style: CSSProperties } {
  return { "data-hue": "", style: { "--hue": hue } };
}
