// Vult een (lokale) Supabase met de fictieve demodata uit fixtures/demo.json.
// Gebruik: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY (zie `npx supabase status`).");
  process.exit(1);
}

const demo = JSON.parse(fs.readFileSync(new URL("../fixtures/demo.json", import.meta.url), "utf8"));
const db = createClient(url, key, { auth: { persistSession: false } });

for (const [table, rows] of [
  ["companies", demo.companies],
  ["deals", demo.deals],
  ["meetings", demo.meetings],
  ["lead_engine", demo.lead_engine],
]) {
  const { error } = await db.from(table).upsert(rows);
  if (error) {
    console.error(`${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`${table}: ${rows.length} rijen`);
}
