import { readFileSync, existsSync } from "node:fs";

const dotenvPath = new URL("../.env", import.meta.url);

function readDotenv() {
  if (!existsSync(dotenvPath)) return {};

  return Object.fromEntries(
    readFileSync(dotenvPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

const dotenv = readDotenv();
const valueFor = (key) => process.env[key] || dotenv[key] || "";

const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];

const missing = required.filter((key) => !valueFor(key));
const revenueCatKey = valueFor("VITE_REVENUECAT_IOS_KEY");

if (missing.length > 0) {
  console.error(`Missing iOS release environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

if (revenueCatKey && !/^appl_[A-Za-z0-9_-]+$/.test(revenueCatKey)) {
  console.error("VITE_REVENUECAT_IOS_KEY should be the iOS public SDK key from RevenueCat, usually starting with appl_.");
  process.exit(1);
}

if (!revenueCatKey) {
  console.log("iOS release environment verified. Paid subscriptions are disabled in this iOS build.");
} else {
  console.log("iOS release environment verified with RevenueCat iOS key.");
}
