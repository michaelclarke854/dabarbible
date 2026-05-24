import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { Share } from "@capacitor/share";
import { isIOSNative } from "./platform";

const PREFERRED_HOUR_KEY = "dabar.native.practice.preferredHour";
const LAST_REFLECTION_KEY = "dabar.native.practice.lastReflection";

export async function nativeTap(style: ImpactStyle = ImpactStyle.Light) {
  if (!isIOSNative()) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Native feedback is supportive only.
  }
}

export async function nativeSuccess() {
  if (!isIOSNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Native feedback is supportive only.
  }
}

export async function saveLastReflection(text: string) {
  if (!isIOSNative()) return;
  await Preferences.set({
    key: LAST_REFLECTION_KEY,
    value: JSON.stringify({ text, savedAt: new Date().toISOString() }),
  });
}

export async function loadLastReflection(): Promise<{ text: string; savedAt: string } | null> {
  if (!isIOSNative()) return null;
  const { value } = await Preferences.get({ key: LAST_REFLECTION_KEY });
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function shareReflection(title: string, text: string) {
  if (isIOSNative() && Capacitor.isPluginAvailable("Share")) {
    await Share.share({ title, text, dialogTitle: title });
    return;
  }

  if (navigator.share) {
    await navigator.share({ title, text });
    return;
  }

  await navigator.clipboard.writeText(text);
}

export async function scheduleDailyPractice(hour: number) {
  if (!isIOSNative()) return false;

  const permissions = await LocalNotifications.requestPermissions();
  if (permissions.display !== "granted") return false;

  await Preferences.set({ key: PREFERRED_HOUR_KEY, value: String(hour) });
  await LocalNotifications.cancel({ notifications: [{ id: 7771 }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 7771,
        title: "DABAR daily practice",
        body: "Pause for scripture, reflection, and prayer.",
        schedule: { on: { hour, minute: 0 }, repeats: true },
        smallIcon: "ic_stat_icon_config_sample",
      },
    ],
  });
  await nativeSuccess();
  return true;
}

export async function loadPracticeHour(): Promise<number | null> {
  if (!isIOSNative()) return null;
  const { value } = await Preferences.get({ key: PREFERRED_HOUR_KEY });
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}
