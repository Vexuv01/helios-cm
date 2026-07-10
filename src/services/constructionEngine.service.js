import { runConstructionEngine } from "../domain/construction-engine";
import { supabase } from "../lib/supabaseClient";

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

function normalizeActivity(row, installedQuantity) {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code || "",
    name: row.name || "",
    discipline: row.discipline || "GENERAL",
    unit: row.unit || "nr",
    baselineQuantity: n(row.baseline_quantity),
    installedQuantity: n(installedQuantity),
    weightPercent: n(row.weight_percent),
    plannedStart: iso(row.planned_start),
    plannedFinish: iso(row.planned_finish),
    actualStart: iso(row.actual_start),
    actualFinish: iso(row.actual_finish),
    status: row.status || "BASELINE",
    sortOrder: n(row.sort_order),
    isGroup: Boolean(row.is_group),
  };
}

function normalizeProject(row) {
  return {
    id: row.id,
    code: row.code || "",
    name: row.name || "",
    status: row.status || null,
    startDate: iso(row.start_date),
    plannedCOD: iso(row.planned_cod),
    forecastCOD: iso(row.forecast_cod),
  };
}

async function loadProject(projectId) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();

  if (error) throw new Error(error.message);
  return normalizeProject(data);
}

async function loadWbsActivities(projectId) {
  const { data, error } = await supabase
    .from("wbs_activities")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

async function loadWeeklyReports(projectId) {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("week_start", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

async function loadWeeklyEntries(reportIds) {
  if (!reportIds.length) return [];

  const { data, error } = await supabase
    .from("weekly_entries")
    .select("*")
    .in("weekly_report_id", reportIds);

  if (error) throw new Error(error.message);
  return data || [];
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

function buildCurve({ activities, reports, entries, plannedProgress, actualProgress }) {
  const datedActivities = activities.filter((activity) => activity.plannedStart && activity.plannedFinish);

  if (!datedActivities.length) {
    return [{ week: "Today", planned: plannedProgress, actual: actualProgress }];
  }

  const starts = datedActivities.map((activity) => toDate(activity.plannedStart)).filter(Boolean);
  const finishes = datedActivities.map((activity) => toDate(activity.plannedFinish)).filter(Boolean);

  const minDate = new Date(Math.min(...starts.map((date) => date.getTime())));
  const maxDate = new Date(Math.max(...finishes.map((date) => date.getTime())));

  const points = [];
  let cursor = minDate;

  while (cursor <= maxDate && points.length < 80) {
    points.push({
      week: iso(cursor),
      planned: calculatePlannedAtPortfolio(activities, cursor),
      actual: calculateActualAt({ activities, reports, entries, date: cursor }),
    });

    cursor = addDays(cursor, 7);
  }

  points.push({
    week: "Today",
    planned: plannedProgress,
    actual: actualProgress,
  });

  return points.filter((point, index, all) => {
    if (point.week === "Today") return true;
    return index === 0 || point.planned !== all[index - 1].planned || point.actual !== all[index - 1].actual;
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

  const [project, rawActivities, reports] = await Promise.all([
    loadProject(projectId),
    loadWbsActivities(projectId),
    loadWeeklyReports(projectId),
  ]);

  const actualReports = reports.filter(isActualReport);
  const entries = await loadWeeklyEntries(actualReports.map((report) => report.id));
  const installedMap = buildInstalledMap(entries);

  const activities = rawActivities
    .filter((activity) => activity.is_group !== true)
    .map((activity) => normalizeActivity(activity, installedMap[activity.id]));

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
