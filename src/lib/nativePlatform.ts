import { Capacitor } from "@capacitor/core";

export const isNativeIos = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
