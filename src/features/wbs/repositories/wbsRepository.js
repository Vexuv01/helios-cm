import { supabase } from "../../../lib/supabaseClient";

const TABLE = "wbs_activities";

function fromDb(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code ?? "",
    name: row.name ?? "",
    discipline: row.discipline ?? "GENERAL",
    parentId: row.parent_id,
    unit: row.unit ?? "nr",
    baselineQuantity: Number(row.baseline_quantity ?? 0),
    installedQuantity: Number(row.installed_quantity ?? 0),
    weightPercent: Number(row.weight_percent ?? 0),
    plannedStart: row.planned_start ?? "",
    plannedFinish: row.planned_finish ?? "",
    status: row.status ?? "DRAFT",
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function toDb(activity) {
  return {
    project_id: activity.projectId,
    code: activity.code,
    name: activity.name,
    discipline: activity.discipline,
    parent_id: activity.parentId || null,
    unit: activity.unit,
    baseline_quantity: Number(activity.baselineQuantity || 0),
    installed_quantity: Number(activity.installedQuantity || 0),
    weight_percent: Number(activity.weightPercent || 0),
    planned_start: activity.plannedStart || null,
    planned_finish: activity.plannedFinish || null,
    status: activity.status,
    sort_order: Number(activity.sortOrder || 0),
    updated_at: new Date().toISOString(),
  };
}

function assertResult(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function listWbsActivities(projectId) {
  const result = await supabase
    .from(TABLE)
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  return assertResult(result).map(fromDb);
}

export async function createWbsActivity(activity) {
  const result = await supabase
    .from(TABLE)
    .insert(toDb(activity))
    .select("*")
    .single();

  return fromDb(assertResult(result));
}

export async function updateWbsActivity(activity) {
  const result = await supabase
    .from(TABLE)
    .update(toDb(activity))
    .eq("id", activity.id)
    .select("*")
    .single();

  return fromDb(assertResult(result));
}

export async function deleteWbsActivity(id) {
  const result = await supabase.from(TABLE).delete().eq("id", id);
  assertResult(result);
  return id;
}
