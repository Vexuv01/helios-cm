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
  status: "DRAFT",
  sortOrder: 0,
};

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
