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
    level: Number(row.level ?? 3),
    isGroup: Boolean(row.is_group ?? false),
    path: row.path ?? "",
    area: row.area ?? "",
    subArea: row.sub_area ?? "",
    system: row.system ?? "",
    contractor: row.contractor ?? "",
    unit: row.unit ?? "nr",
    baselineQuantity: Number(row.baseline_quantity ?? 0),
    installedQuantity: Number(row.installed_quantity ?? 0),
    weightPercent: Number(row.weight_percent ?? 0),
    plannedStart: row.planned_start ?? "",
    plannedFinish: row.planned_finish ?? "",
    actualStart: row.actual_start ?? "",
    actualFinish: row.actual_finish ?? "",
    durationDays: Number(row.duration_days ?? 0),
    milestone: Boolean(row.milestone ?? false),
    remarks: row.remarks ?? "",
    status: row.status ?? "DRAFT",
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function calculateDurationDays(activity) {
  if (!activity.plannedStart || !activity.plannedFinish) return Number(activity.durationDays || 0);

  const start = new Date(activity.plannedStart);
  const finish = new Date(activity.plannedFinish);

  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) {
    return Number(activity.durationDays || 0);
  }

  const ms = finish.getTime() - start.getTime();
  return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 0);
}

function toDb(activity) {
  return {
    project_id: activity.projectId,
    code: activity.code,
    name: activity.name,
    discipline: activity.discipline,
    parent_id: activity.parentId || null,
    level: Number(activity.level || 3),
    is_group: Boolean(activity.isGroup),
    path: activity.path || `${activity.discipline || "GENERAL"}/${activity.code || ""}`,
    area: activity.area ?? "",
    sub_area: activity.subArea ?? "",
    system: activity.system ?? "",
    contractor: activity.contractor ?? "",
    unit: activity.unit,
    baseline_quantity: Number(activity.baselineQuantity || 0),
    installed_quantity: Number(activity.installedQuantity || 0),
    weight_percent: Number(activity.weightPercent || 0),
    planned_start: activity.plannedStart || null,
    planned_finish: activity.plannedFinish || null,
    actual_start: activity.actualStart || null,
    actual_finish: activity.actualFinish || null,
    duration_days: calculateDurationDays(activity),
    milestone: Boolean(activity.milestone),
    remarks: activity.remarks ?? "",
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
