// RevenueCat wrapper. All calls are no-ops outside native iOS so the same
// codebase keeps working in the Vite preview / web build.
//
// Mike: paste the iOS Public API key from app.revenuecat.com into the
// VITE_REVENUECAT_IOS_KEY env var (Lovable Cloud → Variables).

import { isIOSNative } from "./platform";

const REVENUECAT_IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;

let configured = false;

async function loadRC() {
  // Dynamic import so the web bundle never tries to resolve native code.
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod;
}

export async function initRevenueCat(userId: string | null): Promise<void> {
  if (!isIOSNative()) return;
  if (!REVENUECAT_IOS_KEY) {
    // eslint-disable-next-line no-console
    console.warn("[RevenueCat] VITE_REVENUECAT_IOS_KEY missing — IAP disabled.");
    return;
  }
  try {
    const { Purchases, LOG_LEVEL } = await loadRC();
    if (configured) {
      if (userId) await Purchases.logIn({ appUserID: userId });
      return;
    }
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }
    await Purchases.configure({
      apiKey: REVENUECAT_IOS_KEY,
      appUserID: userId ?? undefined,
    });
    configured = true;
  } catch (err) {
    console.error("[RevenueCat] init failed:", err);
  }
}

export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (!isIOSNative()) return;
  if (!configured) return initRevenueCat(userId);
  try {
    const { Purchases } = await loadRC();
    await Purchases.logIn({ appUserID: userId });
  } catch (err) {
    console.error("[RevenueCat] logIn failed:", err);
  }
}

export async function logoutRevenueCatUser(): Promise<void> {
  if (!isIOSNative() || !configured) return;
  try {
    const { Purchases } = await loadRC();
    await Purchases.logOut();
  } catch (err) {
    console.error("[RevenueCat] logOut failed:", err);
  }
}

/** Get current offerings (call from paywall). Returns null off-iOS. */
export async function getCurrentOffering() {
  if (!isIOSNative() || !configured) return null;
  try {
    const { Purchases } = await loadRC();
    const o = await Purchases.getOfferings();
    return o.current ?? null;
  } catch (err) {
    console.error("[RevenueCat] getOfferings failed:", err);
    return null;
  }
}

/** Trigger Apple IAP sheet for a package identifier. */
export async function purchasePackageById(identifier: string): Promise<boolean> {
  if (!isIOSNative()) return false;
  try {
    const { Purchases } = await loadRC();
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find((p) => p.identifier === identifier);
    if (!pkg) throw new Error(`No RC package: ${identifier}`);
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return Boolean(customerInfo.entitlements.active["premium"]);
  } catch (err: any) {
    if (err?.userCancelled) return false;
    console.error("[RevenueCat] purchase failed:", err);
    throw err;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isIOSNative()) return false;
  try {
    const { Purchases } = await loadRC();
    const info = await Purchases.restorePurchases();
    return Boolean(info.customerInfo.entitlements.active["premium"]);
  } catch (err) {
    console.error("[RevenueCat] restore failed:", err);
    return false;
  }
}