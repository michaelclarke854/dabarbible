import { questionPages } from "@/data/questionPages";

// Keyword → topic suffix of an existing /questions/what-does-the-bible-say-about-<topic> page.
const KEYWORDS: Array<[RegExp, string]> = [
  [/anxi|worr(y|ied)|panic|stress/i, "anxiety"],
  [/money|debt|bills|financ/i, "worry-about-money"],
  [/grie|griev|loss|died|death|passed away|mourn/i, "grief"],
  [/afraid|fear|scared/i, "fear"],
  [/lonel|alone|isolat/i, "loneliness"],
  [/forgiv/i, "forgiveness"],
  [/purpose|calling|meaning/i, "purpose"],
  [/doubt|believe/i, "doubt"],
  [/wait/i, "waiting-on-god"],
  [/anger|angry|rage/i, "anger"],
  [/depress|hopeless|despair/i, "depression"],
  [/guilt|shame|ashamed/i, "guilt-and-shame"],
  [/tempt/i, "temptation"],
  [/patien/i, "patience"],
  [/far from god|distant/i, "feeling-far-from-god"],
  [/pray|silent/i, "prayer-when-god-feels-silent"],
  [/start(ing)? over|new beginning|second chance/i, "starting-over"],
  [/uncertain|decision|trust/i, "trusting-god-in-uncertainty"],
  [/content|envy|jealous/i, "contentment"],
  [/bitter|resent/i, "bitterness"],
  [/courage|brave/i, "courage"],
  [/hope/i, "hope"],
];

export function relatedReadingFor(question: string): { href: string; label: string } {
  for (const [re, topic] of KEYWORDS) {
    if (!re.test(question)) continue;
    const slug = `what-does-the-bible-say-about-${topic}`;
    const page = questionPages.find((p) => p.slug === slug);
    if (page) return { href: `/questions/${slug}`, label: page.title ?? "Related reading" };
  }
  return { href: "/blog", label: "Browse our articles" };
}

// Mirrors the server's clinical crisis phrases so a failed request never leaves someone without help.
const CLIENT_CRISIS = [
  "kill myself", "want to die", "suicid", "end my life", "take my life", "can't go on",
  "don't want to be here", "nobody would miss me", "no reason to live", "want it to end",
  "want to disappear", "self harm", "hurt myself",
];
export function looksLikeCrisis(text: string): boolean {
  const l = text.toLowerCase();
  return CLIENT_CRISIS.some((k) => l.includes(k));
}
