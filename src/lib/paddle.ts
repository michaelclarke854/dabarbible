// Paddle.js v2 loader + checkout wrapper. Dormant until VITE_PADDLE_CLIENT_TOKEN is set.
// When the token is absent, isPaddleEnabled() returns false and the app falls back
// to the create-checkout web path. Default environment is 'sandbox'.

type PaddleCheckoutItem = { priceId: string; quantity: number };

interface PaddleCheckoutOpenArgs {
  items: PaddleCheckoutItem[];
  customer?: { email: string };
  customData?: Record<string, unknown>;
  settings?: {
    displayMode?: "overlay" | "inline";
    successUrl?: string;
    theme?: "light" | "dark";
  };
}

interface PaddleGlobal {
  Environment: { set: (env: "sandbox" | "production") => void };
  Initialize: (opts: { token: string; eventCallback?: (e: unknown) => void }) => void;
  Checkout: { open: (args: PaddleCheckoutOpenArgs) => void };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

const PADDLE_JS_URL = "https://cdn.paddle.com/paddle/v2/paddle.js";

let loadPromise: Promise<PaddleGlobal | null> | null = null;
let initialized = false;

function getToken(): string | null {
  const t = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined;
  return t && t.trim().length > 0 ? t.trim() : null;
}

function getEnvironment(): "sandbox" | "production" {
  const e = (import.meta.env.VITE_PADDLE_ENVIRONMENT as string | undefined)?.trim().toLowerCase();
  return e === "production" ? "production" : "sandbox";
}

export function isPaddleEnabled(): boolean {
  return getToken() !== null;
}

export function getPaddleEnvironment(): "sandbox" | "production" {
  return getEnvironment();
}

async function loadScript(): Promise<PaddleGlobal | null> {
  if (typeof window === "undefined") return null;
  if (window.Paddle) return window.Paddle;
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PADDLE_JS_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Paddle ?? null));
      existing.addEventListener("error", () => reject(new Error("Paddle.js failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = PADDLE_JS_URL;
    s.async = true;
    s.onload = () => resolve(window.Paddle ?? null);
    s.onerror = () => reject(new Error("Paddle.js failed to load"));
    document.head.appendChild(s);
  });
}

export async function getPaddle(): Promise<PaddleGlobal | null> {
  const token = getToken();
  if (!token) return null;
  if (!loadPromise) loadPromise = loadScript();
  const paddle = await loadPromise;
  if (!paddle) return null;
  if (!initialized) {
    paddle.Environment.set(getEnvironment());
    paddle.Initialize({ token });
    initialized = true;
  }
  return paddle;
}

export interface OpenPaddleCheckoutArgs {
  priceId: string;
  email: string;
  userId: string;
  successUrl?: string;
}

export async function openPaddleCheckout(args: OpenPaddleCheckoutArgs): Promise<void> {
  const paddle = await getPaddle();
  if (!paddle) throw new Error("Paddle is not configured");
  paddle.Checkout.open({
    items: [{ priceId: args.priceId, quantity: 1 }],
    customer: { email: args.email },
    customData: { user_id: args.userId },
    settings: {
      displayMode: "overlay",
      successUrl: args.successUrl ?? "/payment-success",
    },
  });
}