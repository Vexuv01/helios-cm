import { supabase } from "../lib/supabaseClient";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function progress(actual, baseline) {
  if (!baseline) return 0;
  return Math.min(100, Math.round((actual / baseline) * 100));
}

function dateValue(date) {
  return date ? new Date(date).getTime() : null;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatWeek(date) {
  return date.toISOString().slice(5, 10);
}

function buildPlannedActualCurve(rows, weeklyReports, entries) {
  const validDates = rows
    .flatMap((row) => [row.planned_start, row.planned_finish])
    .filter(Boolean)
    .map((date) => new Date(date));

  if (!validDates.length) return [];

  const minDate = new Date(Math.min(...validDates.map((date) => date.getTime())));
  const maxDate = new Date(Math.max(...validDates.map((date) => date.getTime())));
  const totalWeight = rows.reduce((sum, row) => sum + toNumber(row.weight_percent), 0) || 1;

  const reportById = Object.fromEntries((weeklyReports || []).map((report) => [report.id, report]));

  const actualEntries = (entries || [])
    .map((entry) => ({
      ...entry,
      week_end: reportById[entry.weekly_report_id]?.week_end,
    }))
    .filter((entry) => entry.week_end)
    .sort((a, b) => dateValue(a.week_end) - dateValue(b.week_end));

  const points = [];
  let cursor = new Date(minDate);

  while (cursor <= maxDate) {
    const cursorTime = cursor.getTime();

    const plannedWeighted = rows.reduce((sum, row) => {
      const start = dateValue(row.planned_start);
      const finish = dateValue(row.planned_finish);
      const weight = toNumber(row.weight_percent);

      if (!start || !finish) return sum;
      if (cursorTime < start) return sum;
      if (cursorTime >= finish) return sum + weight;

      const ratio = (cursorTime - start) / Math.max(1, finish - start);
      return sum + weight * ratio;
    }, 0);

    const actualByActivity = {};
    for (const entry of actualEntries) {
      if (dateValue(entry.week_end) <= cursorTime) {
        const activityId = entry.activity_id || entry.wbs_activity_id;
        actualByActivity[activityId] =
          toNumber(actualByActivity[activityId]) + toNumber(entry.actual_quantity);
      }
    }

    const actualWeighted = rows.reduce((sum, row) => {
      const baseline = toNumber(row.baseline_quantity);
      const actual = toNumber(actualByActivity[row.id]);
      const activityProgress = baseline ? Math.min(actual / baseline, 1) : 0;
      return sum + activityProgress * toNumber(row.weight_percent);
    }, 0);

    points.push({
      week: formatWeek(cursor),
      planned: Math.round((plannedWeighted / totalWeight) * 100),
      actual: Math.round((actualWeighted / totalWeight) * 100),
    });

    cursor = addDays(cursor, 7);
  }

  return points.slice(-14);
}

function buildWeeklyProductionByDiscipline(rows, weeklyReports, entries) {
  const latestReport = [...(weeklyReports || [])].sort(
    (a, b) => dateValue(b.week_end) - dateValue(a.week_end)
  )[0];

  if (!latestReport) return [];

  const rowById = Object.fromEntries(rows.map((row) => [row.id, row]));

  const totals = {};

  for (const entry of entries || []) {
    if (entry.weekly_report_id !== latestReport.id) continue;

    const activityId = entry.activity_id || entry.wbs_activity_id;
    const row = rowById[activityId];
    const discipline = row?.discipline || "General";

    totals[discipline] = toNumber(totals[discipline]) + toNumber(entry.actual_quantity);
  }

  return Object.entries(totals).map(([discipline, quantity]) => ({
    discipline,
    quantity,
  }));
}

export async function loadRealConstructionDashboard(projectId) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError) throw projectError;

  const { data: activities, error: wbsError } = await supabase
    .from("wbs_activities")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (wbsError) throw wbsError;

  const { data: weeklyReports, error: reportsError } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("week_end", { ascending: true });

  if (reportsError) throw reportsError;

  const { data: entries, error: entriesError } = await supabase
    .from("weekly_entries")
    .select("id, project_id, weekly_report_id, activity_id, wbs_activity_id, actual_quantity")
    .eq("project_id", projectId);

  if (entriesError) throw entriesError;

  const actualByActivity = {};

  for (const entry of entries || []) {
    const activityId = entry.activity_id || entry.wbs_activity_id;
    actualByActivity[activityId] =
      toNumber(actualByActivity[activityId]) + toNumber(entry.actual_quantity);
  }

  const rows = (activities || []).map((activity) => {
    const actual = actualByActivity[activity.id] || 0;
    const baseline = toNumber(activity.baseline_quantity);
    const rowProgress = progress(actual, baseline);

    return {
      ...activity,
      actual_quantity: actual,
      remaining_quantity: Math.max(0, baseline - actual),
      progress: rowProgress,
    };
  });

  const totalWeight = rows.reduce((sum, row) => sum + toNumber(row.weight_percent), 0) || 1;

  const weightedProgress = rows.reduce(
    (sum, row) => sum + row.progress * toNumber(row.weight_percent),
    0
  );

  const totalProgress = Math.round(weightedProgress / totalWeight);

  const disciplines = Object.values(
    rows.reduce((acc, row) => {
      const key = row.discipline || "General";

      if (!acc[key]) {
        acc[key] = {
          discipline: key,
          weight: 0,
          weightedProgress: 0,
          activities: 0,
          completed: 0,
          remaining: 0,
        };
      }

      acc[key].weight += toNumber(row.weight_percent);
      acc[key].weightedProgress += row.progress * toNumber(row.weight_percent);
      acc[key].activities += 1;
      acc[key].completed += row.progress >= 100 ? 1 : 0;
      acc[key].remaining += toNumber(row.remaining_quantity);

      return acc;
    }, {})
  ).map((item) => ({
    ...item,
    progress: item.weight ? Math.round(item.weightedProgress / item.weight) : 0,
  }));

  const criticalActivities = rows
    .filter((row) => row.progress < 100 && toNumber(row.weight_percent) >= 3)
    .sort((a, b) => toNumber(b.weight_percent) - toNumber(a.weight_percent))
    .slice(0, 6);

  const blocked = rows.filter((row) => row.status === "blocked").length;
  const completed = rows.filter((row) => row.progress >= 100).length;

  const curve = buildPlannedActualCurve(rows, weeklyReports || [], entries || []);
  const latestCurvePoint = curve[curve.length - 1] || { planned: 0, actual: 0 };
  const scheduleGap = latestCurvePoint.actual - latestCurvePoint.planned;

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        50 +
          scheduleGap * 0.8 +
          totalProgress * 0.25 -
          criticalActivities.length * 3 -
          blocked * 10
      )
    )
  );

  const healthBreakdown = [
    { label: "Schedule", value: Math.max(0, Math.min(100, 70 + scheduleGap)) },
    { label: "Progress", value: totalProgress },
    { label: "Critical", value: Math.max(0, 100 - criticalActivities.length * 12) },
    { label: "Blocked", value: Math.max(0, 100 - blocked * 25) },
  ];

  return {
    project,
    rows,
    totalProgress,
    healthScore,
    completed,
    blocked,
    totalActivities: rows.length,
    disciplines,
    criticalActivities,
    curve,
    scheduleGap,
    weeklyProduction: buildWeeklyProductionByDiscipline(rows, weeklyReports || [], entries || []),
    healthBreakdown,
  };
}
