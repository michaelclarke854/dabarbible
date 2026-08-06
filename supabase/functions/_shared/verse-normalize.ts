export function normalizeVerse(s: string): string {
  return s
    .replace(/\{[^}]*:[^}]*\}/g, "")   // KJV marginal notes -> drop entirely
    .replace(/[{}]/g, "")              // italics markers -> keep the words
    .replace(/\[[^\]]*\]/g, "")        // psalm superscriptions -> drop
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}