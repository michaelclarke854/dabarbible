/**
 * Format a timestamp in the app's consistent style:
 * - Same day: "Today · 2:14am"
 * - Yesterday: "Yesterday · 8:30am"
 * - Within 7 days: "Wednesday · 3:22pm"
 * - This year: "Apr 9 · 6:15am"
 * - Previous years: "Mar 14, 2025 · 9:44pm"
 */
export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const time = formatTime(date);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 6);

  if (date >= todayStart) {
    return `Today · ${time}`;
  }
  if (date >= yesterdayStart) {
    return `Yesterday · ${time}`;
  }
  if (date >= weekAgo) {
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    return `${day} · ${time}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    const d = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${d} · ${time}`;
  }

  const d = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${d} · ${time}`;
}

function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")}${ampm}`;
}

/**
 * Returns true if updated_at is meaningfully later than created_at (>60s)
 */
export function wasEdited(createdAt: string, updatedAt: string): boolean {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60000;
}
