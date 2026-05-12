import { Capacitor } from "@capacitor/core";

/** True when running inside the native iOS Capacitor shell. */
export function isIOSNative(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

/** True when running inside any native Capacitor shell (iOS or Android). */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}