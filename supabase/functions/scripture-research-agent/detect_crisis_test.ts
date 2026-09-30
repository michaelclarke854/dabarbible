// Runs the exact detectCrisis source from index.ts (extracted, not copied).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
const start = src.indexOf("const CLINICAL_CRISIS_KEYWORDS");
const fnStart = src.indexOf("function detectCrisis(");
const end = src.indexOf("\n}\n", fnStart) + 3;
const code = src.slice(start, end).replace(/: CrisisResult/g, "")
  .replace(/\(text: string, ageGroup: string \| null\)/, "(text, ageGroup)")
  .replace(/: RegExp\[\]/g, "") + "\nexport { detectCrisis };";
const mod = await import("data:application/typescript," + encodeURIComponent(code));

const cases: [string, string, string][] = [
  ["I want to die and go to heaven", "crisis", "clinical_keyword"],
  ["I feel forsaken", "crisis", "no_downgrade_applied"],
  ["Psalm 22 — I feel forsaken, what does this verse mean?", "watch", "scriptural_frame"],
];
for (const [q, sev, reason] of cases) {
  Deno.test(`detectCrisis: ${q}`, () => {
    const r = mod.detectCrisis(q, null);
    console.log(JSON.stringify({ q, severity: r.severity, reason: r.reason }));
    assertEquals([r.severity, r.reason], [sev, reason]);
  });
}
