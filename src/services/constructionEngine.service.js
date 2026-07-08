import { supabase } from "../lib/supabaseClient";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function progress(actual, baseline) {
  if (!baseline) return 0;
  return Math.min(100, Math.round((actual / baseline) * 100));
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

  const { data: entries, error: entriesError } = await supabase
    .from("weekly_entries")
    .select("activity_id, actual_quantity, weekly_reports!inner(project_id)")
    .eq("weekly_reports.project_id", projectId);

  if (entriesError) throw entriesError;

  const actualByActivity = {};

  for (const entry of entries || []) {
    actualByActivity[entry.activity_id] =
      toNumber(actualByActivity[entry.activity_id]) + toNumber(entry.actual_quantity);
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

  const totalWeight = rows.reduce((sum, row) => sum + toNumber(row.weight_percent), 0);

  const weightedProgress = rows.reduce(
    (sum, row) => sum + row.progress * toNumber(row.weight_percent),
    0
  );

  const totalProgress = totalWeight ? Math.round(weightedProgress / totalWeight) : 0;

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
        };
      }

      acc[key].weight += toNumber(row.weight_percent);
      acc[key].weightedProgress += row.progress * toNumber(row.weight_percent);
      acc[key].activities += 1;
      acc[key].completed += row.progress >= 100 ? 1 : 0;

      return acc;
    }, {})
  ).map((item) => ({
    ...item,
    progress: item.weight ? Math.round(item.weightedProgress / item.weight) : 0,
  }));

  const criticalActivities = rows
    .filter((row) => row.progress < 100 && toNumber(row.weight_percent) >= 3)
    .sort((a, b) => toNumber(b.weight_percent) - toNumber(a.weight_percent))
    .slice(0, 8);

  const blocked = rows.filter((row) => row.status === "blocked").length;
  const completed = rows.filter((row) => row.progress >= 100).length;

  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(100 - blocked * 8 - criticalActivities.length * 2 + totalProgress * 0.25))
  );

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
  };
}
