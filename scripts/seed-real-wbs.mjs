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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const projects = [
  {
    code: "V0012",
    name: "Loffreda",
    location: "Lecce",
    region: "Puglia",
    capacity_dc: 6.0,
    capacity_ac: 5.5,
    status: "construction",
  },
  {
    code: "V0015",
    name: "AtzoriLangiu",
    location: "Nuxis",
    region: "Sardegna",
    capacity_dc: 5.51,
    capacity_ac: 4.9,
    status: "construction",
  },
  {
    code: "V0017",
    name: "Mulas",
    location: "Sassari",
    region: "Sardegna",
    capacity_dc: 29.73,
    capacity_ac: 28.0,
    status: "construction",
  },
  {
    code: "V0020",
    name: "Sortino",
    location: "Enna",
    region: "Sicilia",
    capacity_dc: 8.5,
    capacity_ac: 8.0,
    status: "construction",
  },
  {
    code: "V0021",
    name: "Friargiu2",
    location: "Iglesias",
    region: "Sardegna",
    capacity_dc: 4.55,
    capacity_ac: 4.1,
    status: "construction",
  },
  {
    code: "V0022",
    name: "Bertolin",
    location: "Nuxis",
    region: "Sardegna",
    capacity_dc: 5.6,
    capacity_ac: 5.1,
    status: "construction",
  },
];

const wbsTemplate = [
  ["ENG", "Ingegneria", "Engineering", "Engineering", "lot", 1, 10, "2026-01-01", "2026-07-31", 10],
  ["ENG.01", "Progetto Esecutivo", "Engineering", "Design", "lot", 1, 3, "2026-01-01", "2026-03-31", 11],
  ["ENG.02", "As built e fascicolo finale", "Engineering", "As Built", "lot", 1, 2, "2026-06-01", "2026-07-31", 12],

  ["PRO", "Procurement", "Procurement", "Procurement", "lot", 1, 15, "2026-01-01", "2026-04-30", 20],
  ["PRO.01", "Ordine moduli", "Procurement", "Modules", "lot", 1, 4, "2026-01-01", "2026-02-28", 21],
  ["PRO.02", "Ordine inverter", "Procurement", "Inverters", "lot", 1, 2, "2026-01-01", "2026-02-28", 22],
  ["PRO.03", "Ordine strutture", "Procurement", "Structures", "lot", 1, 3, "2026-01-01", "2026-03-31", 23],
  ["PRO.04", "Ordine materiale elettrico", "Procurement", "Electrical", "lot", 1, 3, "2026-02-01", "2026-04-30", 24],

  ["CIV", "Opere Civili", "Civil", "Construction", "lot", 1, 10, "2026-02-01", "2026-08-31", 30],
  ["CIV.01", "Recinzione", "Civil", "Construction", "ml", 1310, 1.2, "2026-02-01", "2026-03-03", 31],
  ["CIV.02", "Cancelli", "Civil", "Construction", "n", 1, 0.3, "2026-02-15", "2026-03-15", 32],
  ["CIV.03", "Fondazioni cabine", "Civil", "Construction", "n", 4, 1.2, "2026-03-01", "2026-04-15", 33],
  ["CIV.04", "Scavi stringa", "Civil", "Construction", "ml", 467, 1.1, "2026-03-01", "2026-04-30", 34],
  ["CIV.05", "Scavi MT/BT", "Civil", "Construction", "ml", 823, 1.2, "2026-03-15", "2026-05-15", 35],
  ["CIV.06", "Reinterri MT/BT", "Civil", "Construction", "ml", 823, 1.0, "2026-04-01", "2026-06-01", 36],
  ["CIV.07", "Viabilità interna", "Civil", "Construction", "mq", 511, 1.0, "2026-04-01", "2026-06-15", 37],
  ["CIV.08", "Mitigazione", "Civil", "Construction", "ml", 1310, 0.8, "2026-05-01", "2026-08-31", 38],

  ["MEC", "Opere Meccaniche", "Mechanical", "Construction", "lot", 1, 30, "2026-03-01", "2026-09-30", 40],
  ["MEC.01", "Battitura pali", "Mechanical", "Construction", "n", 858, 7, "2026-03-01", "2026-05-31", 41],
  ["MEC.02", "Sovrastrutture tracker", "Mechanical", "Construction", "n", 286, 8, "2026-04-01", "2026-07-31", 42],
  ["MEC.03", "Installazione moduli", "Mechanical", "Construction", "n", 7436, 12, "2026-05-01", "2026-09-30", 43],
  ["MEC.04", "Strutture inverter", "Mechanical", "Construction", "n", 17, 3, "2026-05-15", "2026-08-15", 44],

  ["ELE", "Opere Elettriche", "Electrical", "Construction", "lot", 1, 38, "2026-04-01", "2026-10-31", 50],
  ["ELE.01", "Stringhe", "Electrical", "Construction", "n", 286, 5, "2026-05-01", "2026-09-30", 51],
  ["ELE.02", "Inverter", "Electrical", "Construction", "n", 17, 4, "2026-05-15", "2026-09-30", 52],
  ["ELE.03", "Cabina utente", "Electrical", "Construction", "n", 1, 4, "2026-04-01", "2026-08-31", 53],
  ["ELE.04", "Cavi BT inverter", "Electrical", "Construction", "ml", 6488, 6, "2026-05-01", "2026-10-15", 54],
  ["ELE.05", "Cavi MT", "Electrical", "Construction", "ml", 402, 4, "2026-06-01", "2026-10-15", 55],
  ["ELE.06", "Cavi segnale", "Electrical", "Construction", "ml", 1966, 3, "2026-06-01", "2026-10-15", 56],
  ["ELE.07", "TVCC e illuminazione", "Electrical", "Construction", "ml", 6253, 3, "2026-06-01", "2026-10-31", 57],
  ["ELE.08", "Impianto di terra", "Electrical", "Construction", "ml", 827, 4, "2026-04-15", "2026-09-30", 58],
  ["ELE.09", "Monitoraggio", "Electrical", "Construction", "lot", 1, 2, "2026-08-01", "2026-10-31", 59],

  ["COM", "Collaudi e Commissioning", "Commissioning", "Commissioning", "lot", 1, 6, "2026-10-01", "2026-11-30", 60],
  ["COM.01", "Collaudo tracker", "Commissioning", "Cold Commissioning", "n", 286, 1.5, "2026-10-01", "2026-11-15", 61],
  ["COM.02", "Collaudo rete e TVCC", "Commissioning", "Cold Commissioning", "lot", 1, 1, "2026-10-15", "2026-11-15", 62],
  ["COM.03", "Test SPG/SPI", "Commissioning", "Hot Commissioning", "lot", 1, 1, "2026-10-20", "2026-11-20", 63],
  ["COM.04", "Performance Ratio Test", "Commissioning", "Performance", "lot", 1, 2.5, "2026-11-01", "2026-11-30", 64],
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
  const { error: deleteError } = await supabase
    .from("wbs_activities")
    .delete()
    .eq("project_id", project.id);

  if (deleteError) throw deleteError;

  const rows = wbsTemplate.map(
    ([code, name, discipline, phase, unit, baselineQuantity, weightPercent, plannedStart, plannedFinish, sortOrder]) => ({
      project_id: project.id,
      code,
      name,
      discipline,
      phase,
      unit,
      baseline_quantity: baselineQuantity,
      weight_percent: weightPercent,
      planned_start: plannedStart,
      planned_finish: plannedFinish,
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

console.log("Real projects and WBS seed completed.");
