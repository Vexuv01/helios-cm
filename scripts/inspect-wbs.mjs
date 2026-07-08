import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv() {
  const raw = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
  const env = {};

  for (const line of raw.split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const [key, ...valueParts] = clean.split("=");
    env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  }

  return env;
}

const env = readEnv();

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from("wbs_activities")
  .select("*")
  .order("sort_order", { ascending: true })
  .limit(20);

console.log(JSON.stringify(error || data, null, 2));
