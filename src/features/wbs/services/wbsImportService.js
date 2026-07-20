import { supabase } from "../../../lib/supabaseClient";

function toDb(projectId, activity) {
  return {
    project_id: projectId,
    code: activity.code,
    name: activity.name,
    discipline: activity.discipline,
    parent_id: null,
    level: 3,
    is_group: false,
    path: `${activity.discipline}/${activity.code}`,
    area: activity.area,
    sub_area: activity.subArea,
    system: activity.system,
    contractor: activity.contractor,
    unit: activity.unit,
    baseline_quantity: activity.baselineQuantity,
    installed_quantity: activity.installedQuantity,
    weight_percent: activity.weightPercent,
    planned_start: activity.plannedStart || null,
    planned_finish: activity.plannedFinish || null,
    actual_start: activity.actualStart || null,
    actual_finish: activity.actualFinish || null,
    duration_days: 0,
    milestone: false,
    remarks: "",
    status: activity.status || "BASELINE",
    sort_order: activity.sortOrder,
    updated_at: new Date().toISOString(),
  };
}

async function resetProjectWeekly(projectId) {
  const { data: reports, error } = await supabase
    .from("weekly_reports")
    .select("id")
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);

  const reportIds = (reports || []).map((r) => r.id);

  if (reportIds.length) {
    const removeEntries = await supabase
      .from("weekly_entries")
      .delete()
      .in("weekly_report_id", reportIds);

    if (removeEntries.error) {
      throw new Error(removeEntries.error.message);
    }
  }

  const removeRemainingEntries = await supabase
    .from("weekly_entries")
    .delete()
    .eq("project_id", projectId);

  if (removeRemainingEntries.error) {
    throw new Error(removeRemainingEntries.error.message);
  }

  const removeReports = await supabase
    .from("weekly_reports")
    .delete()
    .eq("project_id", projectId);

  if (removeReports.error) {
    throw new Error(removeReports.error.message);
  }
}

export async function executeWbsImport(projectId, activities) {
  await resetProjectWeekly(projectId);

  const deleted = await supabase
    .from("wbs_activities")
    .delete()
    .eq("project_id", projectId);

  if (deleted.error) {
    throw new Error(deleted.error.message);
  }

  const inserted = await supabase
    .from("wbs_activities")
    .insert(
      activities.map((activity) => toDb(projectId, activity))
    );

  if (inserted.error) {
    throw new Error(inserted.error.message);
  }

  return {
    importedActivities: activities.length,
  };
}
