import {
  canTransition,
  nextWeeklyStatus,
  WEEKLY_STATUS,
} from "../../../domain/workflows/weeklyWorkflow";
import { CONSTRUCTION_EVENTS, emitConstructionEvent } from "../../../shared/events/constructionEvents";
import { loadProjectWbs } from "../../wbs/services/wbsService";
import {
  createWeeklyReport,
  getWeeklyReport,
  listWeeklyEntries,
  sumInstalledQuantity,
  updateWbsInstalledQuantity,
  updateWeeklyReportStatus,
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
      notes: entry?.notes || "",
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
  notes = "",
}) {
  const entry = await upsertWeeklyEntry({
    weeklyReportId,
    projectId,
    wbsActivityId,
    quantityThisWeek,
    notes,
  });

  const installedQuantity = await sumInstalledQuantity(projectId, wbsActivityId);
  await updateWbsInstalledQuantity(wbsActivityId, installedQuantity);

  return entry;
}


async function transitionWeeklyStatus({ projectId, report, nextStatus }) {
  if (!report?.id) {
    throw new Error("Weekly report not found");
  }

  if (!canTransition(report.status, nextStatus)) {
    throw new Error(`Invalid Weekly transition from ${report.status} to ${nextStatus}`);
  }

  const updatedReport = await updateWeeklyReportStatus(report.id, nextStatus);

  emitConstructionEvent(CONSTRUCTION_EVENTS.SNAPSHOT_INVALIDATED, {
    projectId,
    weeklyReportId: report.id,
    reason: `weekly_${nextStatus.toLowerCase()}`,
  });

  return updatedReport;
}

export async function advanceWeeklyWorkflow({ projectId, report }) {
  return transitionWeeklyStatus({
    projectId,
    report,
    nextStatus: nextWeeklyStatus(report.status),
  });
}

export async function submitWeekly({ projectId, report }) {
  return transitionWeeklyStatus({
    projectId,
    report,
    nextStatus: WEEKLY_STATUS.SUBMITTED,
  });
}

export async function validateWeekly({ projectId, report }) {
  return transitionWeeklyStatus({
    projectId,
    report,
    nextStatus: WEEKLY_STATUS.VALIDATED,
  });
}

export async function approveWeekly({ projectId, report }) {
  const approved = await transitionWeeklyStatus({
    projectId,
    report,
    nextStatus: WEEKLY_STATUS.APPROVED,
  });

  return transitionWeeklyStatus({
    projectId,
    report: approved,
    nextStatus: WEEKLY_STATUS.LOCKED,
  });
}
