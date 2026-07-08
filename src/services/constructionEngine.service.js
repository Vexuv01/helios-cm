import { supabase } from "../lib/supabaseClient";

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 1) {
  return Number(n(value).toFixed(digits));
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return null;
}

function parseDate(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStart(activity) {
  return parseDate(pick(activity, "planned_start", "plannedStart"));
}

function getFinish(activity) {
  return parseDate(pick(activity, "planned_finish", "plannedFinish"));
}

function getPlannedWindow(activity) {
  const start = getStart(activity);
  const finish = getFinish(activity);

  if (start && finish) return { start, finish };
  if (start && !finish) return { start, finish: start };
  if (!start && finish) return { start: finish, finish };

  return { start: null, finish: null };
}

function plannedProgress(activity, today = new Date()) {
  const { start, finish } = getPlannedWindow(activity);

  if (!start || !finish) return 0;
  if (today < start) return 0;
  if (today >= finish) return 100;

  const total = finish.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();

  if (total <= 0) return 100;

  return Math.min(Math.max((elapsed / total) * 100, 0), 100);
}

async function loadProject(projectId) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (error) throw new Error(error.message);
  return data;
}

async function loadWbs(projectId) {
  const { data, error } = await supabase
    .from("wbs_activities")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).filter((row) => row.is_group !== true);
}

async function loadWeeklyReports(projectId) {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("project_id", projectId)
    .in("status", ["SUBMITTED", "VALIDATED", "APPROVED", "submitted", "validated", "approved"])
    .order("week_start", { ascending: true });

  if (error) return [];
  return data || [];
}

async function loadWeeklyEntries(reportIds) {
  if (reportIds.length === 0) return [];

  const attempts = [
    () => supabase.from("weekly_entries").select("*").in("weekly_report_id", reportIds),
    () => supabase.from("weekly_production").select("*").in("weekly_report_id", reportIds),
    () => supabase.from("weekly_activities").select("*").in("weekly_report_id", reportIds),
  ];

  for (const attempt of attempts) {
    const { data, error } = await attempt();
    if (!error) return data || [];
  }

  return [];
}

function getEntryActivityId(entry) {
  return entry.activity_id || entry.wbs_activity_id || entry.wbs_id || null;
}

function getEntryQuantity(entry) {
  return n(
    entry.installed_quantity ??
      entry.produced_quantity ??
      entry.quantity ??
      entry.actual_quantity ??
      entry.qty ??
      0
  );
}

function buildActualMap(entries) {
  return entries.reduce((acc, entry) => {
    const activityId = getEntryActivityId(entry);
    if (!activityId) return acc;
    acc[activityId] = n(acc[activityId]) + getEntryQuantity(entry);
    return acc;
  }, {});
}

function buildCurve({ plannedProgressValue, actualProgress }) {
  return [
    { week: "Start", planned: 0, actual: 0 },
    { week: "Today", planned: plannedProgressValue, actual: actualProgress },
    { week: "Finish", planned: 100, actual: actualProgress },
  ];
}

export async function loadRealConstructionDashboard(projectId) {
  const [project, activities, reports] = await Promise.all([
    loadProject(projectId),
    loadWbs(projectId),
    loadWeeklyReports(projectId),
  ]);

  const entries = await loadWeeklyEntries(reports.map((report) => report.id));
  const actualMap = buildActualMap(entries);
  const today = new Date();

  const enriched = activities.map((activity) => {
    const baseline = n(activity.baseline_quantity ?? activity.baselineQuantity);
    const installed = n(actualMap[activity.id]);
    const weight = n(activity.weight_percent ?? activity.weightPercent);
    const start = getStart(activity);
    const finish = getFinish(activity);
    const { start: effectiveStart, finish: effectiveFinish } = getPlannedWindow(activity);

    const actualProgress = baseline > 0 ? Math.min((installed / baseline) * 100, 100) : 0;
    const planned = plannedProgress(activity, today);

    return {
      id: activity.id,
      code: activity.code,
      name: activity.name,
      discipline: activity.discipline || "GENERAL",
      weight,
      baseline,
      installed,
      actualProgress,
      plannedProgress: planned,
      earnedWeight: (actualProgress / 100) * weight,
      plannedWeight: (planned / 100) * weight,
      variance: actualProgress - planned,
      status: activity.status,
      plannedStart: pick(activity, "planned_start", "plannedStart"),
      plannedFinish: pick(activity, "planned_finish", "plannedFinish"),
      hasStart: Boolean(start),
      hasFinish: Boolean(finish),
      hasFullDates: Boolean(start && finish),
      isSchedulable: Boolean(effectiveStart && effectiveFinish),
      hasWeight: weight > 0,
      startedByToday: Boolean(effectiveStart && effectiveStart <= today),
    };
  });

  const totalWeight = enriched.reduce((sum, item) => sum + item.weight, 0);
  const earnedWeight = enriched.reduce((sum, item) => sum + item.earnedWeight, 0);
  const plannedWeight = enriched.reduce((sum, item) => sum + item.plannedWeight, 0);

  const actualProgress = totalWeight > 0 ? round((earnedWeight / totalWeight) * 100) : 0;
  const plannedProgressValue = totalWeight > 0 ? round((plannedWeight / totalWeight) * 100) : 0;
  const scheduleGap = round(actualProgress - plannedProgressValue);

  const criticalActivities = enriched
    .filter((item) => item.plannedProgress >= 20 && item.actualProgress < item.plannedProgress - 10)
    .sort((a, b) => a.variance - b.variance);

  const blocked = enriched.filter((item) => String(item.status || "").toLowerCase() === "blocked").length;

  const disciplines = Object.values(
    enriched.reduce((acc, item) => {
      if (!acc[item.discipline]) {
        acc[item.discipline] = {
          discipline: item.discipline,
          weight: 0,
          earnedWeight: 0,
          plannedWeight: 0,
          activities: 0,
        };
      }

      acc[item.discipline].weight += item.weight;
      acc[item.discipline].earnedWeight += item.earnedWeight;
      acc[item.discipline].plannedWeight += item.plannedWeight;
      acc[item.discipline].activities += 1;
      return acc;
    }, {})
  ).map((item) => ({
    ...item,
    progress: item.weight > 0 ? round((item.earnedWeight / item.weight) * 100) : 0,
    planned: item.weight > 0 ? round((item.plannedWeight / item.weight) * 100) : 0,
  }));

  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(100 + scheduleGap - criticalActivities.length * 5 - blocked * 10))
  );

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status || null,
    },

    totalProgress: actualProgress,
    plannedProgress: plannedProgressValue,
    scheduleGap,
    healthScore,
    blocked,
    criticalActivities,
    disciplines,
    curve: buildCurve({ plannedProgressValue, actualProgress }),

    weightDistribution: disciplines.map((item) => ({
      discipline: item.discipline,
      value: round(item.weight),
    })),

    healthBreakdown: [
      { label: "Health", value: healthScore },
      { label: "Risk", value: 100 - healthScore },
    ],

    weeklyReports: reports.length,
    weeklyEntries: entries.length,

    dataSource: {
      actualSource: "Weekly only",
      plannedSource: "WBS dates + WBS weight",
      wbsActivities: activities.length,
      activitiesWithDates: enriched.filter((item) => item.hasFullDates).length,
      schedulableActivities: enriched.filter((item) => item.isSchedulable).length,
      activitiesWithStart: enriched.filter((item) => item.hasStart).length,
      activitiesWithFinish: enriched.filter((item) => item.hasFinish).length,
      activitiesWithWeight: enriched.filter((item) => item.hasWeight).length,
      activitiesStartedByToday: enriched.filter((item) => item.startedByToday).length,
      totalWeight: round(totalWeight, 2),
      weeklyReports: reports.length,
      weeklyEntries: entries.length,
      today: today.toISOString().slice(0, 10),
    },

    decisionFeed:
      reports.length === 0
        ? [
            {
              type: "DATA",
              title: "Nessuna Weekly reale caricata",
              message: "Actual Progress è 0%. La Control Room usa solo Weekly submitted / validated / approved.",
            },
          ]
        : criticalActivities.slice(0, 4).map((activity) => ({
            type: "ACTION",
            title: `${activity.code} · ${activity.name}`,
            message: `${activity.discipline}: ${round(activity.actualProgress)}% actual vs ${round(
              activity.plannedProgress
            )}% planned.`,
          })),
  };
}
