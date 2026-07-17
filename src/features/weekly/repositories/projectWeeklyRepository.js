import { supabase } from "../../../lib/supabaseClient";

function assertResult(result, fallbackMessage) {
  if (result.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result.data;
}

export async function listWeeklyProjects() {
  const result = await supabase
    .from("projects")
    .select("*")
    .order("code", { ascending: true });

  return assertResult(result, "Unable to load projects") || [];
}

export async function listWeeklyWbsActivities(projectId) {
  if (!projectId) return [];

  const result = await supabase
    .from("wbs_activities")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  return assertResult(result, "Unable to load WBS activities") || [];
}

export async function listProjectWeeklyReports(projectId) {
  if (!projectId) return [];

  const result = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("week_start", { ascending: true });

  return assertResult(result, "Unable to load Weekly reports") || [];
}

export async function listWeeklyEntriesByReportIds(reportIds) {
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from("weekly_entries")
    .select("*")
    .in("weekly_report_id", reportIds);

  return assertResult(result, "Unable to load Weekly entries") || [];
}

export async function upsertProjectWeeklyReport({
  projectId,
  weekStart,
  weekEnd,
  status,
}) {
  const result = await supabase
    .from("weekly_reports")
    .upsert(
      {
        project_id: projectId,
        week_start: weekStart,
        week_end: weekEnd,
        status,
      },
      {
        onConflict: "project_id,week_start",
      }
    )
    .select("*")
    .single();

  return assertResult(result, "Unable to save Weekly report");
}

export async function replaceProjectWeeklyEntries({
  projectId,
  weeklyReportId,
  entries,
}) {
  const deleteResult = await supabase
    .from("weekly_entries")
    .delete()
    .eq("weekly_report_id", weeklyReportId);

  assertResult(deleteResult, "Unable to replace Weekly entries");

  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const payload = entries.map((entry) => ({
    project_id: projectId,
    weekly_report_id: weeklyReportId,
    activity_id: entry.activityId,
    wbs_activity_id: entry.activityId,
    actual_quantity: Number(entry.quantity || 0),
  }));

  const insertResult = await supabase
    .from("weekly_entries")
    .insert(payload)
    .select("*");

  return assertResult(insertResult, "Unable to save Weekly entries") || [];
}

export async function updateProjectWeeklyReportStatus(reportId, status) {
  const result = await supabase
    .from("weekly_reports")
    .update({ status })
    .eq("id", reportId)
    .select("*")
    .single();

  return assertResult(result, "Unable to update Weekly status");
}

export async function deleteProjectWeeklyReport(reportId) {
  const deleteEntriesResult = await supabase
    .from("weekly_entries")
    .delete()
    .eq("weekly_report_id", reportId);

  assertResult(deleteEntriesResult, "Unable to delete Weekly entries");

  const deleteReportResult = await supabase
    .from("weekly_reports")
    .delete()
    .eq("id", reportId);

  assertResult(deleteReportResult, "Unable to delete Weekly report");
}
