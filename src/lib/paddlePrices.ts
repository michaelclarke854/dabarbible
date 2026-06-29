import { supabase } from "@/integrations/supabase/client";

// Maps app_config paddle_price_* rows → priceId resolver.
// Keys follow the pattern: paddle_price_<plan>_<cycle|student>
//   personal_monthly, personal_annual, personal_student
//   family_monthly,   family_annual
//   community_monthly

export type PaddlePlanKey = "personal" | "family" | "community";
export type PaddleCycle = "monthly" | "annual";

type PriceTable = Record<string, string>;

let cache: PriceTable | null = null;
let inflight: Promise<PriceTable> | null = null;

async function load(): Promise<PriceTable> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("app_config")
      .select("key, value")
      .like("key", "paddle_price_%");
    if (error) throw error;
    const table: PriceTable = {};
    for (const row of data ?? []) {
      if (row.value && String(row.value).trim().length > 0) {
        table[row.key] = String(row.value).trim();
      }
    }
    cache = table;
    return table;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export async function resolvePaddlePriceId(args: {
  planKey: PaddlePlanKey;
  cycle: PaddleCycle;
  isStudent?: boolean;
}): Promise<string | null> {
  const table = await load();
  if (args.planKey === "personal" && args.isStudent && args.cycle === "monthly") {
    const student = table["paddle_price_personal_student"];
    if (student) return student;
  }
  const key = `paddle_price_${args.planKey}_${args.cycle}`;
  return table[key] ?? null;
}

export function clearPaddlePriceCache() {
  cache = null;
}