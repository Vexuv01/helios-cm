import { supabase } from "../../../lib/supabaseClient";

function assertResult(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function fromReportDb(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    status: row.status,
    notes: row.notes ?? "",
  };
}

function fromEntryDb(row) {
  return {
    id: row.id,
    weeklyReportId: row.weekly_report_id,
    projectId: row.project_id,
    wbsActivityId: row.wbs_activity_id,
    quantityThisWeek: Number(row.quantity_this_week ?? 0),
    notes: row.notes ?? "",
  };
}

export async function getWeeklyReport(projectId, weekStart) {
  const result = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("project_id", projectId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const data = assertResult(result);
  return data ? fromReportDb(data) : null;
}

export async function createWeeklyReport({ projectId, weekStart, weekEnd }) {
  const result = await supabase
    .from("weekly_reports")
    .insert({
      project_id: projectId,
      week_start: weekStart,
      week_end: weekEnd,
      status: "DRAFT",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  return fromReportDb(assertResult(result));
}

export async function listWeeklyEntries(reportId) {
  const result = await supabase
    .from("weekly_entries")
    .select("*")
    .eq("weekly_report_id", reportId);

  return assertResult(result).map(fromEntryDb);
}

export async function upsertWeeklyEntry(entry) {
  const result = await supabase
    .from("weekly_entries")
    .upsert(
      {
        weekly_report_id: entry.weeklyReportId,
        project_id: entry.projectId,
        wbs_activity_id: entry.wbsActivityId,
        quantity_this_week: Number(entry.quantityThisWeek || 0),
        notes: entry.notes ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "weekly_report_id,wbs_activity_id" }
    )
    .select("*")
    .single();

  return fromEntryDb(assertResult(result));
}

export async function sumInstalledQuantity(projectId, wbsActivityId) {
  const result = await supabase
    .from("weekly_entries")
    .select("quantity_this_week")
    .eq("project_id", projectId)
    .eq("wbs_activity_id", wbsActivityId);

  const rows = assertResult(result);

  return rows.reduce(
    (sum, row) => sum + Number(row.quantity_this_week || 0),
    0
  );
}

export async function updateWbsInstalledQuantity(activityId, installedQuantity) {
  const result = await supabase
    .from("wbs_activities")
    .update({
      installed_quantity: Number(installedQuantity || 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", activityId);

  assertResult(result);
  return installedQuantity;
}
