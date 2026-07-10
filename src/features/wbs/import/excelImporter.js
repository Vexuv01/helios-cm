import { supabase } from "../../../lib/supabaseClient";
import { parseWbsExcelFile } from "./excelParser";
import { validateWbsActivities } from "./excelValidator";

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

function buildPreviewMessage(file, validation, activities) {
  const previewRows = activities
    .slice(0, 8)
    .map(
      (activity) =>
        `${activity.code} | ${activity.name} | ${activity.baselineQuantity} ${activity.unit} | ${activity.weightPercent}%`
    )
    .join("\n");

  return [
    "IMPORT WBS EXCEL",
    "",
    `File: ${file.name}`,
    "",
    `Activities found: ${validation.activitiesCount}`,
    `Total Weight: ${validation.totalWeight.toFixed(2)}%`,
    "",
    "Preview:",
    previewRows || "No preview available",
    "",
    "La WBS esistente del progetto corrente verrà sostituita.",
    "",
    "Procedere con l'import?"
  ].join("\n");
}

export async function importWbsExcelFile(projectId, file) {
  const activities = await parseWbsExcelFile(file);
  const validation = validateWbsActivities(activities);

  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }

  const confirmed = window.confirm(buildPreviewMessage(file, validation, activities));

  if (!confirmed) return null;

  const deleteResult = await supabase
    .from("wbs_activities")
    .delete()
    .eq("project_id", projectId);

  if (deleteResult.error) throw new Error(deleteResult.error.message);

  const insertResult = await supabase
    .from("wbs_activities")
    .insert(activities.map((activity) => toDb(projectId, activity)));

  if (insertResult.error) throw new Error(insertResult.error.message);

  return validation;
}
