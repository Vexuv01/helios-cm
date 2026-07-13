import { supabase } from "../../../lib/supabaseClient";

function assertResult(result, fallbackMessage) {
  if (result.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result.data;
}

export async function listRecoveryWbsActivities(projectId) {
  if (!projectId) return [];

  const result = await supabase
    .from("wbs_activities")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_group", false)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  return assertResult(
    result,
    "Unable to load Recovery WBS activities"
  ) || [];
}

export async function listRecoveryWeeklyReports(projectId) {
  if (!projectId) return [];

  const result = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("project_id", projectId);

  return assertResult(
    result,
    "Unable to load Recovery Weekly reports"
  ) || [];
}

export async function listRecoveryWeeklyEntries(reportIds) {
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from("weekly_entries")
    .select("*")
    .in("weekly_report_id", reportIds);

  return assertResult(
    result,
    "Unable to load Recovery Weekly entries"
  ) || [];
}
