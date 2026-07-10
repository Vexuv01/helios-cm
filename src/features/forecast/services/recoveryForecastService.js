import { supabase } from "../../../lib/supabaseClient";

function normalize(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    activityId: row.wbs_activity_id,
    forecastStart: row.forecast_start || "",
    forecastFinish: row.forecast_finish || "",
    forecastNote: row.forecast_note || "",
    status: row.status || "DRAFT",
  };
}

function toDb(projectId, item) {
  return {
    project_id: projectId,
    wbs_activity_id: item.activityId,
    forecast_start: item.forecastStart || null,
    forecast_finish: item.forecastFinish || null,
    forecast_note: item.forecastNote || null,
    status: item.status || "DRAFT",
    updated_at: new Date().toISOString(),
  };
}

export async function loadRecoveryForecast(projectId) {
  if (!projectId) return [];

  const { data, error } = await supabase
    .from("wbs_recovery_forecasts")
    .select("*")
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);
  return (data || []).map(normalize);
}

export async function saveRecoveryForecast(projectId, items) {
  if (!projectId) throw new Error("Project id is required");

  const rows = items
    .filter((item) => item.activityId)
    .map((item) => toDb(projectId, item));

  if (!rows.length) return [];

  const { data, error } = await supabase
    .from("wbs_recovery_forecasts")
    .upsert(rows, { onConflict: "project_id,wbs_activity_id" })
    .select("*");

  if (error) throw new Error(error.message);
  return (data || []).map(normalize);
}
