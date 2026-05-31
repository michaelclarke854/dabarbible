import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

console.time('[DABAR] app:mount');
queueMicrotask(() => console.timeEnd('[DABAR] app:mount'));

// ── Low-end Android / old WebView detection ─────────────────────────────────
// On Android 8/9 WebViews the animated grain overlay + backdrop-filter blurs
// dominate the main-thread compositor budget. We tag <html> with `.low-end`
// so index.css can disable the most expensive visual effects without changing
// the design on capable devices. Safe heuristic — never disables features,
// only animations & blurs.
(() => {
  try {
    const ua = navigator.userAgent || "";
    const androidMatch = /Android\s(\d+)/i.exec(ua);
    const androidMajor = androidMatch ? parseInt(androidMatch[1], 10) : 0;
    const isOldAndroid = androidMajor > 0 && androidMajor <= 9;
    const lowMem = (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 2;
    const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isOldAndroid || lowMem || (isOldAndroid && lowCores) || prefersReduced) {
      document.documentElement.classList.add("low-end");
      // eslint-disable-next-line no-console
      console.info("[DABAR] perf: low-end mode enabled", {
        androidMajor: androidMajor || null,
        deviceMemory: (navigator as any).deviceMemory ?? null,
        cores: navigator.hardwareConcurrency ?? null,
      });
    }
  } catch {
    /* noop */
  }
})();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
