import { buildConstructionSnapshot } from "../../../domain/construction-engine";
import { CONSTRUCTION_EVENTS, emitConstructionEvent } from "../../../shared/events/constructionEvents";
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
  area: "",
  subArea: "",
  system: "",
  contractor: "",
  unit: "nr",
  baselineQuantity: 0,
  installedQuantity: 0,
  weightPercent: 0,
  plannedStart: "",
  plannedFinish: "",
  actualStart: "",
  actualFinish: "",
  durationDays: 0,
  milestone: false,
  remarks: "",
  status: "BASELINE",
  sortOrder: 0,
};

export const FV_AGRIPV_WBS_TEMPLATE = [
  ["ENG-001", "ENGINEERING", "Prima Emissione PE", "n°", 1, 2, "2025-11-01", "2025-12-01", "ENGINEERING", "EPC"],
  ["ENG-002", "ENGINEERING", "Emissione Finale PE", "n°", 1, 1, "2025-12-01", "2025-12-31", "ENGINEERING", "EPC"],
  ["PRO-001", "PROCUREMENT", "Ordine Moduli", "n°", 1, 0.75, "2025-12-15", "2025-12-15", "MODULES", "EPC"],
  ["PRO-002", "PROCUREMENT", "Ordine Inverter", "n°", 1, 0.75, "2026-01-31", "2026-01-31", "INVERTERS", "EPC"],
  ["PRO-003", "PROCUREMENT", "Ordine Strutture", "n°", 1, 2.25, "2025-11-30", "2025-11-30", "TRACKER", "EPC"],
  ["CIV-001", "CIVIL", "Recinzione", "ml", 1310, 1.125, "2026-02-09", "2026-03-03", "CIVIL WORKS", "EPC"],
  ["CIV-002", "CIVIL", "Cancelli", "n°", 1, 0.15, "2026-03-02", "2026-03-03", "CIVIL WORKS", "EPC"],
  ["CIV-003", "CIVIL", "Fondazioni cabine", "n°", 4, 0.75, "2026-03-30", "2026-04-24", "CIVIL WORKS", "EPC"],
  ["MEC-002", "MECHANICAL", "Battitura Pali", "n°", 858, 9, "2026-02-18", "2026-03-31", "TRACKER", "EPC"],
  ["MEC-003", "MECHANICAL", "Sovrastrutture tipo 1", "n°", 286, 6.75, "2026-03-16", "2026-05-01", "TRACKER", "EPC"],
  ["MEC-005", "MECHANICAL", "Montaggio Moduli", "n°", 7436, 5.625, "2026-04-02", "2026-06-10", "MODULES", "EPC"],
  ["ELE-001", "ELECTRICAL", "Stringatura moduli", "n°", 286, 2.85, "2026-05-07", "2026-07-01", "DC SYSTEM", "EPC"],
  ["ELE-002", "ELECTRICAL", "Montaggio e cablaggio Inverter", "n°", 17, 2.85, "2026-05-18", "2026-06-16", "INVERTERS", "EPC"],
  ["ELE-005", "ELECTRICAL", "Stesura Cavi BT Inverter", "ml", 6488, 2.85, "2026-03-30", "2026-04-27", "BT SYSTEM", "EPC"],
  ["ELE-009", "ELECTRICAL", "Stesura Cavi MT", "ml", 402, 2.85, "2026-04-06", "2026-04-13", "MT SYSTEM", "EPC"],
  ["COM-001", "COMMISSIONING", "Collaudo Tracker", "nr", 286, 0.9, "2026-07-20", "2026-07-31", "COMMISSIONING", "EPC"],
  ["COM-007", "COMMISSIONING", "Collaudo elettrico impianto PR", "nr", 1, 0.9, "2026-09-01", "2026-09-09", "COMMISSIONING", "EPC"],
  ["GRD-001", "GRID_CONNECTION", "Scavi e reinterri", "ml", 2350, 2.4, "2026-04-13", "2026-05-15", "GRID CONNECTION", "EPC"],
  ["GRD-003", "GRID_CONNECTION", "Stesura Cavo", "ml", 2500, 1.8, "2026-05-15", "2026-06-11", "GRID CONNECTION", "EPC"],
  ["GRD-006", "GRID_CONNECTION", "Collaudo Opere di Rete", "n°", 1, 1.8, "2026-06-12", "2026-06-12", "GRID CONNECTION", "EPC"],
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
    durationDays: Number(activity.durationDays || 0),
    milestone: Boolean(activity.milestone),
    sortOrder: Number(activity.sortOrder || 0),
  };

  const savedActivity = payload.id
    ? await updateWbsActivity(payload)
    : await createWbsActivity(payload);

  emitConstructionEvent(CONSTRUCTION_EVENTS.ACTIVITY_CHANGED, {
    projectId,
    activityId: savedActivity.id,
    action: payload.id ? "updated" : "created",
  });

  emitConstructionEvent(CONSTRUCTION_EVENTS.SNAPSHOT_INVALIDATED, {
    projectId,
    reason: "activity_saved",
  });

  return savedActivity;
}

export async function removeWbsActivity(id, projectId = null) {
  const deletedId = await deleteWbsActivity(id);

  emitConstructionEvent(CONSTRUCTION_EVENTS.ACTIVITY_CHANGED, {
    projectId,
    activityId: id,
    action: "deleted",
  });

  emitConstructionEvent(CONSTRUCTION_EVENTS.SNAPSHOT_INVALIDATED, {
    projectId,
    reason: "activity_deleted",
  });

  return deletedId;
}

export async function importPvAgripvWbsTemplate(projectId) {
  const current = await listWbsActivities(projectId);

  if (current.length > 0) {
    throw new Error("This project already has WBS activities. Delete existing rows before importing the standard template.");
  }

  const created = [];

  for (const [index, item] of FV_AGRIPV_WBS_TEMPLATE.entries()) {
    const [
      code,
      discipline,
      name,
      unit,
      baselineQuantity,
      weightPercent,
      plannedStart,
      plannedFinish,
      system,
      contractor,
    ] = item;

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
      system,
      contractor,
      status: "BASELINE",
      sortOrder: index + 1,
    });

    created.push(activity);
  }

  emitConstructionEvent(CONSTRUCTION_EVENTS.SNAPSHOT_INVALIDATED, {
    projectId,
    reason: "template_imported",
  });

  return created;
}
