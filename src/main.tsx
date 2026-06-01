import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
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

const rootEl = document.getElementById("root")!;

// ── Runtime check: missing Supabase env vars ────────────────────────────────
// If the build was published without VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY,
// importing the Supabase client throws and React never mounts → blank black page.
// Detect this up front and render a friendly fallback instead.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const missing = [
    !SUPABASE_URL && "VITE_SUPABASE_URL",
    !SUPABASE_KEY && "VITE_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean).join(", ");

  console.error("[DABAR] Missing required environment variables:", missing);

  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0F0D0A;color:#F5F0E8;font-family:Georgia,'Times New Roman',serif;text-align:center;">
      <div style="max-width:480px;">
        <h1 style="font-size:28px;margin:0 0 16px;color:#C4973A;letter-spacing:0.04em;">Dabar is temporarily unavailable</h1>
        <p style="font-size:16px;line-height:1.6;margin:0 0 20px;opacity:0.85;">
          We're unable to connect to the service right now. Please refresh in a few moments, or come back shortly.
        </p>
        <p style="font-size:13px;opacity:0.5;margin:0;">
          If this persists, contact support.
        </p>
      </div>
    </div>
  `;
} else {
  // Dynamic import so the Supabase client (which would throw on missing env)
  // is only loaded after the guard above passes.
  import("./App.tsx").then(({ default: App }) => {
    createRoot(rootEl).render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );
  });
}
