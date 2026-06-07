import { isNative } from "@/lib/platform";

let initialized = false;
let loggedInUserId: string | null = null;

function getApiKey(): string {
  return (import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined) || "";
}

async function loadPurchases() {
  if (!isNative()) return null;
  try {
    const mod = await import("@revenuecat/purchases-capacitor");
    return mod.Purchases;
  } catch (err) {
    console.warn("[RC] failed to load purchases-capacitor", err);
    return null;
  }
}

export async function initRevenueCat(appUserId?: string): Promise<void> {
  if (!isNative()) return;
  const apiKey = getApiKey();
  if (!apiKey) return;
  const Purchases = await loadPurchases();
  if (!Purchases) return;
  try {
    if (!initialized) {
      await Purchases.configure({ apiKey, appUserID: appUserId });
      initialized = true;
      if (appUserId) loggedInUserId = appUserId;
    } else if (appUserId && appUserId !== loggedInUserId) {
      await rcLogIn(appUserId);
    }
  } catch (err) {
    console.warn("[RC] configure failed", err);
  }
}

export async function rcLogIn(appUserId: string): Promise<void> {
  if (!isNative() || !getApiKey()) return;
  const Purchases = await loadPurchases();
  if (!Purchases) return;
  try {
    await Purchases.logIn({ appUserID: appUserId });
    loggedInUserId = appUserId;
  } catch (err) {
    console.warn("[RC] logIn failed", err);
  }
}

export async function rcLogOut(): Promise<void> {
  if (!isNative() || !getApiKey()) return;
  const Purchases = await loadPurchases();
  if (!Purchases) return;
  try {
    await Purchases.logOut();
    loggedInUserId = null;
  } catch {
    // anonymous users throw; ignore
  }
}

export async function rcHasActiveEntitlement(): Promise<boolean> {
  if (!isNative() || !getApiKey()) return false;
  const Purchases = await loadPurchases();
  if (!Purchases) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return Object.keys(customerInfo?.entitlements?.active ?? {}).length > 0;
  } catch (err) {
    console.warn("[RC] getCustomerInfo failed", err);
    return false;
  }
}

export async function rcRestore(): Promise<boolean> {
  if (!isNative() || !getApiKey()) return false;
  const Purchases = await loadPurchases();
  if (!Purchases) return false;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return Object.keys(customerInfo?.entitlements?.active ?? {}).length > 0;
  } catch (err) {
    console.warn("[RC] restore failed", err);
    return false;
  }
}

export async function rcGetCurrentOffering() {
  if (!isNative() || !getApiKey()) return null;
  const Purchases = await loadPurchases();
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings?.current ?? null;
  } catch (err) {
    console.warn("[RC] getOfferings failed", err);
    return null;
  }
}

export async function rcPurchasePackage(aPackage: unknown): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  if (!isNative() || !getApiKey()) return { ok: false, error: "RevenueCat not available" };
  const Purchases = await loadPurchases();
  if (!Purchases) return { ok: false, error: "RevenueCat not available" };
  try {
    const result = await Purchases.purchasePackage({ aPackage: aPackage as never });
    const active = Object.keys(result?.customerInfo?.entitlements?.active ?? {}).length > 0;
    return { ok: active };
  } catch (err: unknown) {
    const e = err as { userCancelled?: boolean; message?: string; code?: string | number };
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: e?.message || "Purchase failed" };
  }
}