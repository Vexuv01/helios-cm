import { WEEKLY_STATUS } from "../../../domain/workflows/weeklyWorkflow";
import {
  deleteProjectWeeklyReport,
  listProjectWeeklyReports,
  listWeeklyEntriesByReportIds,
  listWeeklyProjects,
  listWeeklyWbsActivities,
  replaceProjectWeeklyEntries,
  updateProjectWeeklyReportStatus,
  upsertProjectWeeklyReport,
} from "../repositories/projectWeeklyRepository";

const ACTUAL_WEEKLY_STATUSES = new Set([
  WEEKLY_STATUS.SUBMITTED,
  WEEKLY_STATUS.VALIDATED,
  WEEKLY_STATUS.APPROVED,
]);

export function toWeeklyNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getWeeklyEntryQuantity(entry) {
  return toWeeklyNumber(
    entry?.actual_quantity ??
      entry?.quantity_this_week ??
      entry?.installed_quantity ??
      entry?.produced_quantity ??
      entry?.quantity ??
      entry?.qty ??
      0
  );
}

export function getWeeklyEntryActivityId(entry) {
  return (
    entry?.wbs_activity_id ||
    entry?.activity_id ||
    entry?.wbs_id ||
    ""
  );
}

export function isActualWeeklyStatus(status) {
  return ACTUAL_WEEKLY_STATUSES.has(
    String(status || "").toUpperCase()
  );
}

export function isWeeklyProductionLocked(status) {
  return isActualWeeklyStatus(status);
}

export async function loadProjectWeeklyProduction({
  requestedProjectId,
  routeProjectId,
  weekStart,
}) {
  const projects = await listWeeklyProjects();

  const projectId =
    requestedProjectId ||
    routeProjectId ||
    projects[0]?.id ||
    "";

  if (!projectId) {
    return {
      projects,
      projectId: "",
      reports: [],
      report: null,
      activities: [],
      weeklyValues: {},
      cumulativeValues: {},
    };
  }

  const [activities, reports] = await Promise.all([
    listWeeklyWbsActivities(projectId),
    listProjectWeeklyReports(projectId),
  ]);

  const currentReport =
    reports.find((item) => item.week_start === weekStart) || null;

  const entries = await listWeeklyEntriesByReportIds(
    reports.map((item) => item.id)
  );

  const validActivityIds = new Set(
    activities.map((activity) => activity.id)
  );

  const validEntries = entries.filter((entry) =>
    validActivityIds.has(getWeeklyEntryActivityId(entry))
  );

  const reportsById = new Map(
    reports.map((item) => [item.id, item])
  );

  const validReportIds = new Set(
    validEntries.map((entry) => entry.weekly_report_id)
  );

  const visibleReports = reports.filter(
    (item) =>
      validReportIds.has(item.id) ||
      item.id === currentReport?.id
  );

  const weeklyValues = {};
  const cumulativeValues = {};

  validEntries.forEach((entry) => {
    const activityId = getWeeklyEntryActivityId(entry);
    if (!activityId) return;

    const relatedReport = reportsById.get(
      entry.weekly_report_id
    );

    const quantity = getWeeklyEntryQuantity(entry);

    if (relatedReport?.id === currentReport?.id) {
      weeklyValues[activityId] = quantity;
    }

    if (
      relatedReport?.week_start < weekStart &&
      isActualWeeklyStatus(relatedReport?.status)
    ) {
      cumulativeValues[activityId] =
        toWeeklyNumber(cumulativeValues[activityId]) +
        quantity;
    }
  });

  return {
    projects,
    projectId,
    reports: visibleReports,
    report: currentReport,
    activities,
    weeklyValues,
    cumulativeValues,
  };
}

export async function saveProjectWeeklyProduction({
  projectId,
  weekStart,
  weekEnd,
  status = WEEKLY_STATUS.DRAFT,
  weeklyValues,
}) {
  const report = await upsertProjectWeeklyReport({
    projectId,
    weekStart,
    weekEnd,
    status,
  });

  const entries = Object.entries(weeklyValues || {})
    .filter(([, value]) => toWeeklyNumber(value) !== 0)
    .map(([activityId, value]) => ({
      activityId,
      quantity: toWeeklyNumber(value),
    }));

  await replaceProjectWeeklyEntries({
    projectId,
    weeklyReportId: report.id,
    entries,
  });

  return report;
}

export async function unlockProjectWeekly(reportId) {
  if (!reportId) {
    throw new Error("Weekly report not found");
  }

  return updateProjectWeeklyReportStatus(
    reportId,
    WEEKLY_STATUS.DRAFT
  );
}

export async function removeProjectWeekly(reportId) {
  if (!reportId) {
    throw new Error("Weekly report not found");
  }

  await deleteProjectWeeklyReport(reportId);
}
