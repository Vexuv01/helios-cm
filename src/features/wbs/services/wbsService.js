import { buildConstructionSnapshot } from "../../../domain/construction-engine";
import {
  createWbsActivity,
  deleteWbsActivity,
  listWbsActivities,
  updateWbsActivity,
} from "../repositories/wbsRepository";

export const EMPTY_WBS_ACTIVITY = {
  id: "",
  projectId: "",
  code: "",
  name: "",
  discipline: "GENERAL",
  parentId: "",
  unit: "nr",
  baselineQuantity: 0,
  installedQuantity: 0,
  weightPercent: 0,
  plannedStart: "",
  plannedFinish: "",
  status: "BASELINE",
  sortOrder: 0,
};

export const FV_AGRIPV_WBS_TEMPLATE = [
  ["ENG-001", "ENGINEERING", "Prima Emissione PE", "n°", 1, 2, "2025-11-01", "2025-12-01"],
  ["ENG-002", "ENGINEERING", "Emissione Finale PE", "n°", 1, 1, "2025-12-01", "2025-12-31"],
  ["ENG-003", "ENGINEERING", "As built e fascicolo finale", "n°", 1, 0.5, "2026-07-30", "2026-07-30"],
  ["ENG-004", "ENGINEERING", "Prima Emissione PE Opere di Rete", "n°", 1, 2, "2025-11-01", "2025-12-01"],
  ["ENG-005", "ENGINEERING", "Emissione Finale PE Opere di Rete", "n°", 1, 1, "2025-12-01", "2025-12-31"],
  ["ENG-006", "ENGINEERING", "As built e fascicolo finale Opere di Rete", "n°", 1, 0.5, "2026-07-20", "2026-07-20"],
  ["ENG-007", "ENGINEERING", "RDE", "n°", 1, 0.5, "2026-07-20", "2026-07-20"],
  ["ENG-008", "ENGINEERING", "Validazione RDE", "n°", 1, 0.5, "2026-07-31", "2026-07-31"],
  ["ENG-009", "ENGINEERING", "POT / PO Test", "n°", 1, 0.5, "2026-09-24", "2026-09-26"],
  ["ENG-010", "ENGINEERING", "Rilievi topografici", "n°", 1, 0.5, "2025-11-01", "2025-12-01"],
  ["ENG-011", "ENGINEERING", "Relazioni specialistiche", "n°", 1, 1, "2025-12-01", "2025-12-31"],

  ["PRO-001", "PROCUREMENT", "Ordine Moduli", "n°", 1, 0.75, "2025-12-15", "2025-12-15"],
  ["PRO-002", "PROCUREMENT", "Ordine Inverter", "n°", 1, 0.75, "2026-01-31", "2026-01-31"],
  ["PRO-003", "PROCUREMENT", "Ordine Strutture", "n°", 1, 2.25, "2025-11-30", "2025-11-30"],
  ["PRO-004", "PROCUREMENT", "Ordine Shelter", "n°", 1, 1.5, "2025-12-15", "2025-12-15"],
  ["PRO-005", "PROCUREMENT", "Ordine Cabinati", "n°", 1, 0.75, "2025-12-15", "2025-12-15"],
  ["PRO-006", "PROCUREMENT", "Ordine Materiale Elettrico", "n°", 1, 3, "2026-01-01", "2026-02-28"],
  ["PRO-007", "PROCUREMENT", "Ordine per Subappalto", "n°", 1, 6, "2025-12-01", "2025-12-31"],

  ["CIV-001", "CIVIL", "Recinzione", "ml", 1310, 1.125, "2026-02-09", "2026-03-03"],
  ["CIV-002", "CIVIL", "Cancelli", "n°", 1, 0.15, "2026-03-02", "2026-03-03"],
  ["CIV-003", "CIVIL", "Fondazioni cabine", "n°", 4, 0.75, "2026-03-30", "2026-04-24"],
  ["CIV-004", "CIVIL", "Scavi e reinterri per cavi stringa", "ml", 467, 0.75, "2026-03-16", "2026-04-06"],
  ["CIV-005", "CIVIL", "Scavi per cavi MT/BT", "ml", 823, 0.75, "2026-03-23", "2026-04-10"],
  ["CIV-006", "CIVIL", "Reinterri per cavi MT/BT", "ml", 823, 0.75, "2026-04-06", "2026-04-24"],
  ["CIV-007", "CIVIL", "Scavi e reinterri perimetrale", "ml", 1295, 0.225, "2026-03-16", "2026-04-01"],
  ["CIV-008", "CIVIL", "Opere di regimentazione idraulica", "mc", 0, 0, "", ""],
  ["CIV-009", "CIVIL", "Opere di mitigazione", "ml", 1310, 0.375, "2026-05-19", "2026-06-08"],
  ["CIV-010", "CIVIL", "Viabilità interna", "mq", 511, 0.375, "2026-04-10", "2026-05-18"],
  ["CIV-011", "CIVIL", "Posa plinti portapali e pali", "n°", 34, 0.375, "2026-03-16", "2026-04-01"],
  ["CIV-012", "CIVIL", "Spostamento Ulivi", "n°", 250, 0.75, "2026-02-09", "2026-02-27"],
  ["CIV-013", "CIVIL", "Sbancamenti e reinterri", "mc", 3480, 1.125, "2026-02-16", "2026-03-10"],

  ["MEC-001", "MECHANICAL", "Pre-fori", "n°", 0, 0, "", ""],
  ["MEC-002", "MECHANICAL", "Battitura Pali", "n°", 858, 9, "2026-02-18", "2026-03-31"],
  ["MEC-003", "MECHANICAL", "Sovrastrutture tipo 1", "n°", 286, 6.75, "2026-03-16", "2026-05-01"],
  ["MEC-004", "MECHANICAL", "Sovrastrutture tipo 2", "n°", 0, 0, "", ""],
  ["MEC-005", "MECHANICAL", "Montaggio Moduli", "n°", 7436, 5.625, "2026-04-02", "2026-06-10"],
  ["MEC-006", "MECHANICAL", "Montaggio Strutture Inverter", "n°", 17, 1.125, "2026-05-04", "2026-05-15"],

  ["ELE-001", "ELECTRICAL", "Stringatura moduli (numero stringhe)", "n°", 286, 2.85, "2026-05-07", "2026-07-01"],
  ["ELE-002", "ELECTRICAL", "Montaggio e cablaggio Inverter", "n°", 17, 2.85, "2026-05-18", "2026-06-16"],
  ["ELE-003", "ELECTRICAL", "Predisposizione Cabina Utente", "n°", 1, 1.425, "2026-04-21", "2026-05-01"],
  ["ELE-004", "ELECTRICAL", "Cablaggi Cabina Utente", "n°", 1, 2.85, "2026-04-21", "2026-05-21"],
  ["ELE-005", "ELECTRICAL", "Stesura Cavi BT Inverter", "ml", 6488, 2.85, "2026-03-30", "2026-04-27"],
  ["ELE-006", "ELECTRICAL", "Stesura Cavi BT", "ml", 404, 2.85, "2026-03-30", "2026-04-20"],
  ["ELE-007", "ELECTRICAL", "Stesura Cavi segnale", "ml", 1966, 1.425, "2026-04-21", "2026-05-04"],
  ["ELE-008", "ELECTRICAL", "Stesura cavo TVCC e illuminazione", "ml", 6253, 1.425, "2026-05-14", "2026-05-15"],
  ["ELE-009", "ELECTRICAL", "Stesura Cavi MT", "ml", 402, 2.85, "2026-04-06", "2026-04-13"],
  ["ELE-010", "ELECTRICAL", "Installazione e cablaggio sistema monitoraggio", "nr", 1, 1.425, "2026-07-16", "2026-07-29"],
  ["ELE-011", "ELECTRICAL", "Installazione e cablaggio sistema di monitoraggio Agri", "nr", 15, 1.425, "2026-07-16", "2026-07-29"],
  ["ELE-012", "ELECTRICAL", "Installazione e cablaggio TVCC e illuminazione", "nr", 34, 1.425, "2026-05-06", "2026-05-12"],
  ["ELE-013", "ELECTRICAL", "Installazione e cablaggio quadri rete", "nr", 4, 1.425, "2026-04-15", "2026-04-30"],
  ["ELE-014", "ELECTRICAL", "Impianto di terra (cavo+corda)", "ml", 827, 1.425, "2026-04-06", "2026-05-10"],

  ["COM-001", "COMMISSIONING", "Collaudo Tracker", "nr", 286, 0.9, "2026-07-20", "2026-07-31"],
  ["COM-002", "COMMISSIONING", "Collaudo Rete e TVCC", "nr", 1, 0.9, "2026-05-15", "2026-06-30"],
  ["COM-003", "COMMISSIONING", "Taratura SPG/SPI", "nr", 1, 0.45, "2026-07-20", "2026-07-31"],
  ["COM-004", "COMMISSIONING", "Configurazione Inverter e monitoraggio", "nr", 1, 0.45, "2026-09-01", "2026-09-09"],
  ["COM-005", "COMMISSIONING", "Verifica Resistenza di Terra", "nr", 1, 0.45, "2026-06-03", "2026-06-06"],
  ["COM-006", "COMMISSIONING", "Configurazione CCI", "nr", 1, 0.45, "2026-07-20", "2026-07-31"],
  ["COM-007", "COMMISSIONING", "Collaudo elettrico impianto (PR)", "nr", 1, 0.9, "2026-09-01", "2026-09-09"],

  ["GRD-001", "GRID_CONNECTION", "Scavi e reinterri", "ml", 2350, 2.4, "2026-04-13", "2026-05-15"],
  ["GRD-002", "GRID_CONNECTION", "TOC", "ml", 380, 2.4, "2026-04-30", "2026-05-17"],
  ["GRD-003", "GRID_CONNECTION", "Stesura Cavo", "ml", 2500, 1.8, "2026-05-15", "2026-06-11"],
  ["GRD-004", "GRID_CONNECTION", "Ripristini manto stradale", "ml", 0, 0, "", ""],
  ["GRD-005", "GRID_CONNECTION", "Allestimento cabina consegna/sezionamento", "n°", 1, 1.8, "2026-06-01", "2026-06-11"],
  ["GRD-006", "GRID_CONNECTION", "Collaudo Opere di Rete", "n°", 1, 1.8, "2026-06-12", "2026-06-12"],
  ["GRD-007", "GRID_CONNECTION", "Lavori in Cabina Primaria", "n°", 1, 1.8, "2026-06-01", "2026-06-11"],
];

export async function loadProjectWbs(projectId) {
  const activities = await listWbsActivities(projectId);
  return buildConstructionSnapshot(activities);
}

export async function saveWbsActivity(projectId, activity) {
  const payload = {
    ...EMPTY_WBS_ACTIVITY,
    ...activity,
    projectId,
    baselineQuantity: Number(activity.baselineQuantity || 0),
    installedQuantity: Number(activity.installedQuantity || 0),
    weightPercent: Number(activity.weightPercent || 0),
    sortOrder: Number(activity.sortOrder || 0),
  };

  if (payload.id) return updateWbsActivity(payload);
  return createWbsActivity(payload);
}

export async function removeWbsActivity(id) {
  return deleteWbsActivity(id);
}

export async function importPvAgripvWbsTemplate(projectId) {
  const current = await listWbsActivities(projectId);

  if (current.length > 0) {
    throw new Error("This project already has WBS activities. Delete existing rows before importing the standard template.");
  }

  const created = [];

  for (const [index, item] of FV_AGRIPV_WBS_TEMPLATE.entries()) {
    const [code, discipline, name, unit, baselineQuantity, weightPercent, plannedStart, plannedFinish] = item;

    const activity = await createWbsActivity({
      ...EMPTY_WBS_ACTIVITY,
      projectId,
      code,
      discipline,
      name,
      unit,
      baselineQuantity,
      weightPercent,
      plannedStart,
      plannedFinish,
      status: "BASELINE",
      sortOrder: index + 1,
    });

    created.push(activity);
  }

  return created;
}
