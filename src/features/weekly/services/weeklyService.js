import { loadProjectWbs } from "../../wbs/services/wbsService";
import {
  createWeeklyReport,
  getWeeklyReport,
  listWeeklyEntries,
  sumInstalledQuantity,
  updateWbsInstalledQuantity,
  upsertWeeklyEntry,
} from "../repositories/weeklyRepository";

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    weekStart: toIsoDate(monday),
    weekEnd: toIsoDate(friday),
  };
}

export async function loadWeeklyWorkspace(projectId, weekStart, weekEnd) {
  let report = await getWeeklyReport(projectId, weekStart);

  if (!report) {
    report = await createWeeklyReport({ projectId, weekStart, weekEnd });
  }

  const [wbsSnapshot, entries] = await Promise.all([
    loadProjectWbs(projectId),
    listWeeklyEntries(report.id),
  ]);

  const entryByActivity = new Map(
    entries.map((entry) => [entry.wbsActivityId, entry])
  );

  const rows = wbsSnapshot.activities.map((activity) => {
    const entry = entryByActivity.get(activity.id);

    return {
      activity,
      entry,
      quantityThisWeek: Number(entry?.quantityThisWeek || 0),
    };
  });

  return {
    report,
    rows,
    snapshot: wbsSnapshot,
  };
}

export async function saveWeeklyQuantity({
  projectId,
  weeklyReportId,
  wbsActivityId,
  quantityThisWeek,
}) {
  const entry = await upsertWeeklyEntry({
    weeklyReportId,
    projectId,
    wbsActivityId,
    quantityThisWeek,
  });

  const installedQuantity = await sumInstalledQuantity(projectId, wbsActivityId);
  await updateWbsInstalledQuantity(wbsActivityId, installedQuantity);

  return entry;
}
