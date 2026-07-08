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
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const projects = [
  { code: "V0012", name: "Loffreda", status: "construction" },
  { code: "V0015", name: "AtzoriLangiu", status: "construction" },
  { code: "V0017", name: "Mulas", status: "construction" },
  { code: "V0020", name: "Sortino", status: "construction" },
  { code: "V0021", name: "Friargiu2", status: "construction" },
  { code: "V0022", name: "Bertolin", status: "construction" },
];

const wbsTemplate = [
  ["ENG", "Ingegneria", "Engineering", "lot", 1, 10, 10],
  ["ENG.01", "Progetto Esecutivo", "Engineering", "lot", 1, 3, 11],
  ["ENG.02", "As built e fascicolo finale", "Engineering", "lot", 1, 2, 12],

  ["PRO", "Procurement", "Procurement", "lot", 1, 15, 20],
  ["PRO.01", "Ordine moduli", "Procurement", "lot", 1, 4, 21],
  ["PRO.02", "Ordine inverter", "Procurement", "lot", 1, 2, 22],
  ["PRO.03", "Ordine strutture", "Procurement", "lot", 1, 3, 23],

  ["CIV", "Opere Civili", "Civil", "lot", 1, 10, 30],
  ["CIV.01", "Recinzione", "Civil", "ml", 1310, 1.2, 31],
  ["CIV.02", "Cancelli", "Civil", "n", 1, 0.3, 32],
  ["CIV.03", "Fondazioni cabine", "Civil", "n", 4, 1.2, 33],
  ["CIV.04", "Scavi stringa", "Civil", "ml", 467, 1.1, 34],
  ["CIV.05", "Scavi MT/BT", "Civil", "ml", 823, 1.2, 35],
  ["CIV.06", "Reinterri MT/BT", "Civil", "ml", 823, 1, 36],
  ["CIV.07", "Viabilità interna", "Civil", "mq", 511, 1, 37],

  ["MEC", "Opere Meccaniche", "Mechanical", "lot", 1, 30, 40],
  ["MEC.01", "Battitura pali", "Mechanical", "n", 858, 7, 41],
  ["MEC.02", "Sovrastrutture tracker", "Mechanical", "n", 286, 8, 42],
  ["MEC.03", "Installazione moduli", "Mechanical", "n", 7436, 12, 43],
  ["MEC.04", "Strutture inverter", "Mechanical", "n", 17, 3, 44],

  ["ELE", "Opere Elettriche", "Electrical", "lot", 1, 38, 50],
  ["ELE.01", "Stringhe", "Electrical", "n", 286, 5, 51],
  ["ELE.02", "Inverter", "Electrical", "n", 17, 4, 52],
  ["ELE.03", "Cabina utente", "Electrical", "n", 1, 4, 53],
  ["ELE.04", "Cavi BT inverter", "Electrical", "ml", 6488, 6, 54],
  ["ELE.05", "Cavi MT", "Electrical", "ml", 402, 4, 55],
  ["ELE.06", "Cavi segnale", "Electrical", "ml", 1966, 3, 56],
  ["ELE.07", "TVCC e illuminazione", "Electrical", "ml", 6253, 3, 57],
  ["ELE.08", "Impianto di terra", "Electrical", "ml", 827, 4, 58],

  ["COM", "Collaudi e Commissioning", "Commissioning", "lot", 1, 6, 60],
  ["COM.01", "Collaudo tracker", "Commissioning", "n", 286, 1.5, 61],
  ["COM.02", "Collaudo rete e TVCC", "Commissioning", "lot", 1, 1, 62],
  ["COM.03", "Test SPG/SPI", "Commissioning", "lot", 1, 1, 63],
  ["COM.04", "Performance Ratio Test", "Commissioning", "lot", 1, 2.5, 64],
];

async function upsertProject(project) {
  const { data, error } = await supabase
    .from("projects")
    .upsert(project, { onConflict: "code" })
    .select("id, code, name")
    .single();

  if (error) throw error;
  return data;
}

async function seedWbs(project) {
  await supabase.from("wbs_activities").delete().eq("project_id", project.id);

  const rows = wbsTemplate.map(
    ([code, name, discipline, unit, baselineQuantity, weightPercent, sortOrder]) => ({
      project_id: project.id,
      code,
      name,
      discipline,
      unit,
      baseline_quantity: baselineQuantity,
      weight_percent: weightPercent,
      sort_order: sortOrder,
      status: "not_started",
    })
  );

  const { error } = await supabase.from("wbs_activities").insert(rows);
  if (error) throw error;
}

for (const project of projects) {
  const savedProject = await upsertProject(project);
  await seedWbs(savedProject);
  console.log(`Seeded ${savedProject.code} - ${savedProject.name}`);
}

console.log("Seed completed.");
