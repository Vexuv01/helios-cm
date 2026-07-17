import { runConstructionEngine } from "../domain/construction-engine";
import {
  mapConstructionActivity,
  mapConstructionProject,
} from "../features/dashboard/domain/constructionDashboardMapper";
import {
  getConstructionProject,
  getConstructionRecoveryForecast,
  listConstructionWbsActivities,
  listConstructionWeeklyEntries,
  listConstructionWeeklyReports,
} from "../features/dashboard/repositories/constructionDashboardRepository";

const ACTUAL_WEEKLY_STATUSES = new Set(["SUBMITTED", "VALIDATED", "APPROVED", "LOCKED"]);

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 1) {
  return Number(n(value).toFixed(digits));
}

function iso(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getEntryQty(entry) {
  return n(
    entry.actual_quantity ??
      entry.installed_quantity ??
      entry.produced_quantity ??
      entry.quantity ??
      entry.qty ??
      0
  );
}

function getEntryActivityId(entry) {
  return entry.wbs_activity_id || entry.activity_id || entry.wbs_id || "";
}

function isActualReport(report) {
  return ACTUAL_WEEKLY_STATUSES.has(String(report.status || "").toUpperCase());
}

async function loadProject(projectId) {
  const row = await getConstructionProject(projectId);
  return mapConstructionProject(row);
}

async function loadWbsActivities(projectId) {
  return listConstructionWbsActivities(projectId);
}

async function loadWeeklyReports(projectId) {
  return listConstructionWeeklyReports(projectId);
}

async function loadWeeklyEntries(reportIds) {
  return listConstructionWeeklyEntries(reportIds);
}

async function loadRecoveryForecasts(projectId) {
  return getConstructionRecoveryForecast(projectId);
}

function buildInstalledMap(entries) {
  return entries.reduce((acc, entry) => {
    const activityId = getEntryActivityId(entry);
    if (!activityId) return acc;

    acc[activityId] = n(acc[activityId]) + getEntryQty(entry);
    return acc;
  }, {});
}

function calculatePlannedAt(activity, date) {
  const start = toDate(activity.plannedStart);
  const finish = toDate(activity.plannedFinish);

  if (!start || !finish) return 0;
  if (date < start) return 0;
  if (date >= finish) return 100;

  const totalMs = finish.getTime() - start.getTime();
  const elapsedMs = date.getTime() - start.getTime();

  if (totalMs <= 0) return 100;
  return Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100);
}

function calculateActualAt({ activities, reports, entries, date }) {
  const reportIds = reports
    .filter((report) => isActualReport(report) && toDate(report.week_start) <= date)
    .map((report) => report.id);

  const reportIdSet = new Set(reportIds);
  const entriesUntilDate = entries.filter((entry) => reportIdSet.has(entry.weekly_report_id));
  const installedMap = buildInstalledMap(entriesUntilDate);

  const totalWeight = activities.reduce((sum, activity) => sum + n(activity.weightPercent), 0);

  const earnedWeight = activities.reduce((sum, activity) => {
    const baseline = n(activity.baselineQuantity);
    const installed = n(installedMap[activity.id]);
    const weight = n(activity.weightPercent);
    const progress = baseline > 0 ? Math.min((installed / baseline) * 100, 100) : 0;

    return sum + (progress / 100) * weight;
  }, 0);

  return totalWeight > 0 ? round((earnedWeight / totalWeight) * 100) : 0;
}

function calculatePlannedAtPortfolio(activities, date) {
  const totalWeight = activities.reduce((sum, activity) => sum + n(activity.weightPercent), 0);

  const plannedWeight = activities.reduce((sum, activity) => {
    const planned = calculatePlannedAt(activity, date);
    return sum + (planned / 100) * n(activity.weightPercent);
  }, 0);

  return totalWeight > 0 ? round((plannedWeight / totalWeight) * 100) : 0;
}

function calculateForecastAt(activity, date, recoveryAnchorDate = new Date()) {
  const baseline = n(activity.baselineQuantity);
  const installed = n(activity.installedQuantity);
  const actualProgress = baseline > 0 ? Math.min((installed / baseline) * 100, 100) : 0;

  const forecastStart = toDate(activity.forecastStart || activity.plannedStart);
  const forecastFinish = toDate(activity.forecastFinish || activity.plannedFinish);

  if (!forecastStart || !forecastFinish) return actualProgress;

  const anchor =
    forecastStart > recoveryAnchorDate ? forecastStart : recoveryAnchorDate;

  if (date <= recoveryAnchorDate) return actualProgress;
  if (date < anchor) return actualProgress;
  if (date >= forecastFinish) return 100;

  const totalMs = forecastFinish.getTime() - anchor.getTime();
  const elapsedMs = date.getTime() - anchor.getTime();

  if (totalMs <= 0) return 100;

  const recoveryRatio = Math.min(Math.max(elapsedMs / totalMs, 0), 1);
  return actualProgress + (100 - actualProgress) * recoveryRatio;
}

function calculateForecastAtPortfolio(activities, date, recoveryAnchorDate = new Date()) {
  const totalWeight = activities.reduce((sum, activity) => sum + n(activity.weightPercent), 0);

  const forecastWeight = activities.reduce((sum, activity) => {
    const forecast = calculateForecastAt(activity, date, recoveryAnchorDate);
    return sum + (forecast / 100) * n(activity.weightPercent);
  }, 0);

  return totalWeight > 0 ? round((forecastWeight / totalWeight) * 100) : 0;
}

function buildCurve({ activities, reports, entries, plannedProgress, actualProgress }) {
  const hasRecoveryForecast = activities.some(
    (activity) => activity.forecastStart && activity.forecastFinish
  );

  const datedActivities = activities.filter(
    (activity) =>
      (activity.plannedStart && activity.plannedFinish) ||
      (activity.forecastStart && activity.forecastFinish)
  );

  if (!datedActivities.length) {
    return [{ week: "Today", planned: plannedProgress, actual: actualProgress }];
  }

  const starts = datedActivities
    .flatMap((activity) => [activity.plannedStart, activity.forecastStart])
    .map(toDate)
    .filter(Boolean);

  const finishes = datedActivities
    .flatMap((activity) => [activity.plannedFinish, activity.forecastFinish])
    .map(toDate)
    .filter(Boolean);

  const minDate = new Date(Math.min(...starts.map((date) => date.getTime())));
  const maxDate = new Date(Math.max(...finishes.map((date) => date.getTime())));

  const points = [];
  let cursor = minDate;

  while (cursor <= maxDate && points.length < 120) {
    const point = {
      week: iso(cursor),
      planned: calculatePlannedAtPortfolio(activities, cursor),
      actual: calculateActualAt({ activities, reports, entries, date: cursor }),
    };

    if (hasRecoveryForecast) {
      point.forecast =
        cursor <= new Date()
          ? point.actual
          : calculateForecastAtPortfolio(activities, cursor, new Date());
    }

    points.push(point);
    cursor = addDays(cursor, 7);
  }

  const todayPoint = {
    week: "Today",
    planned: plannedProgress,
    actual: actualProgress,
  };

  if (hasRecoveryForecast) {
    todayPoint.forecast = actualProgress;
  }

  points.push(todayPoint);

  return points.filter((point, index, all) => {
    if (point.week === "Today") return true;
    const previous = all[index - 1];
    return (
      index === 0 ||
      point.planned !== previous.planned ||
      point.actual !== previous.actual ||
      point.forecast !== previous.forecast
    );
  });
}

function buildDataSource({ rawActivities, activities, actualReports, entries }) {
  return {
    actualSource: "Weekly only",
    plannedSource: "WBS dates + WBS weight",
    wbsActivities: rawActivities.length,
    activitiesWithDates: activities.filter((activity) => activity.plannedStart && activity.plannedFinish).length,
    schedulableActivities: activities.filter((activity) => activity.plannedStart && activity.plannedFinish).length,
    activitiesWithStart: activities.filter((activity) => activity.plannedStart).length,
    activitiesWithFinish: activities.filter((activity) => activity.plannedFinish).length,
    activitiesWithWeight: activities.filter((activity) => n(activity.weightPercent) > 0).length,
    activitiesStartedByToday: activities.filter((activity) => {
      const start = toDate(activity.plannedStart);
      return start && start <= new Date();
    }).length,
    totalWeight: round(
      activities.reduce((sum, activity) => sum + n(activity.weightPercent), 0),
      2
    ),
    weeklyReports: actualReports.length,
    weeklyEntries: entries.length,
    today: iso(new Date()),
  };
}

function toDashboard({ project, rawActivities, activities, reports, actualReports, entries, engine }) {
  const totalProgress = round(engine.overallProgress);
  const plannedProgress = round(engine.plannedProgress);
  const scheduleGap = round(engine.scheduleVariance);
  const healthScore = Math.round(n(engine.healthScore));

  const disciplines = (engine.disciplines || []).map((item) => ({
    discipline: item.discipline,
    weight: round(item.weightPercent ?? item.weight ?? 0, 2),
    progress: round(item.progress ?? item.actualProgress ?? 0),
    planned: round(item.plannedProgress ?? item.planned ?? 0),
    activities: item.activities ?? item.count ?? 0,
  }));

  const criticalActivities = (engine.criticalActivities || []).map((activity) => ({
    id: activity.id,
    code: activity.code,
    name: activity.name,
    discipline: activity.discipline,
    actualProgress: round(activity.progress ?? activity.actualProgress ?? 0),
    plannedProgress: round(activity.plannedProgress ?? 0),
    variance: round(activity.variance ?? 0),
  }));

  return {
    project,
    totalProgress,
    plannedProgress,
    scheduleGap,
    healthScore,
    blocked: activities.filter((activity) => String(activity.status || "").toLowerCase() === "blocked").length,
    criticalActivities,
    disciplines,
    recoveryPlan: {
      active: activities.some((activity) => activity.forecastStart && activity.forecastFinish),
      issueDate: activities.find((activity) => activity.recoveryIssueDate)?.recoveryIssueDate || "",
      revisionNumber: activities.find((activity) => activity.recoveryRevisionNumber)?.recoveryRevisionNumber || null,
      status: activities.find((activity) => activity.recoveryStatus)?.recoveryStatus || "",
    },
    hasRecoveryForecast: activities.some((activity) => activity.forecastStart && activity.forecastFinish),
    curve: buildCurve({ activities, reports, entries, plannedProgress, actualProgress: totalProgress }),

    weightDistribution: disciplines.map((item) => ({
      discipline: item.discipline,
      value: round(item.weight, 2),
    })),

    healthBreakdown: [
      { label: "Health", value: healthScore },
      { label: "Risk", value: 100 - healthScore },
    ],

    weeklyReports: actualReports.length,
    weeklyEntries: entries.length,
    dataSource: buildDataSource({ rawActivities, activities, actualReports, entries }),

    decisionFeed:
      actualReports.length === 0
        ? [
            {
              type: "DATA",
              title: "Nessuna Weekly reale caricata",
              message: "Actual Progress è 0%. La Control Room usa solo Weekly submitted / validated / approved.",
            },
          ]
        : (engine.decisionFeed || []).length > 0
          ? engine.decisionFeed
          : criticalActivities.slice(0, 4).map((activity) => ({
              type: "ACTION",
              title: `${activity.code} · ${activity.name}`,
              message: `${activity.discipline}: ${activity.actualProgress}% actual vs ${activity.plannedProgress}% planned.`,
            })),
  };
}

export async function loadRealConstructionDashboard(projectId) {
  if (!projectId) throw new Error("Project id is required");

  const [project, rawActivities, reports, recoveryPlan] = await Promise.all([
    loadProject(projectId),
    loadWbsActivities(projectId),
    loadWeeklyReports(projectId),
    loadRecoveryForecasts(projectId),
  ]);

  const actualReports = reports.filter(isActualReport);
  const entries = await loadWeeklyEntries(actualReports.map((report) => report.id));
  const installedMap = buildInstalledMap(entries);
  const forecastMap = recoveryPlan.items.reduce((acc, forecast) => {
    acc[forecast.wbs_activity_id] = {
      ...forecast,
      recovery_issue_date: recoveryPlan.revision?.issue_date || "",
      recovery_revision_number: recoveryPlan.revision?.revision_number || null,
      recovery_status: recoveryPlan.revision?.status || "",
    };
    return acc;
  }, {});

  const activities = rawActivities
    .filter((activity) => activity.is_group !== true)
    .map((activity) => mapConstructionActivity(activity, installedMap[activity.id], forecastMap[activity.id]));

  const engine = runConstructionEngine({
    project,
    activities,
  });

  return toDashboard({
    project,
    rawActivities,
    activities,
    reports,
    actualReports,
    entries,
    engine,
  });
}
