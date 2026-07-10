import { supabase } from "../../../lib/supabaseClient";

function normalizeRevision(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    revisionNumber: Number(row.revision_number || 1),
    title: row.title || "Recovery Plan",
    status: row.status || "DRAFT",
    issueDate: row.issue_date || "",
    generalNote: row.general_note || "",
    actualProgressSnapshot: Number(row.actual_progress_snapshot || 0),
    plannedProgressSnapshot: Number(row.planned_progress_snapshot || 0),
    actualQtySnapshot: Number(row.actual_qty_snapshot || 0),
    remainingQtySnapshot: Number(row.remaining_qty_snapshot || 0),
    forecastFinishSnapshot: row.forecast_finish_snapshot || "",
  };
}

function normalizeItem(row) {
  return {
    id: row.id,
    revisionId: row.revision_id,
    projectId: row.project_id,
    activityId: row.wbs_activity_id,
    forecastStart: row.forecast_start || "",
    forecastFinish: row.forecast_finish || "",
    forecastNote: row.forecast_note || "",
  };
}

export async function loadRecoveryRevisions(projectId) {
  if (!projectId) return [];

  const { data, error } = await supabase
    .from("recovery_plan_revisions")
    .select("*")
    .eq("project_id", projectId)
    .order("revision_number", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeRevision);
}

export async function createRecoveryRevision(projectId) {
  const revisions = await loadRecoveryRevisions(projectId);
  const nextNumber =
    revisions.length > 0
      ? Math.max(...revisions.map((item) => item.revisionNumber)) + 1
      : 1;

  const { data, error } = await supabase
    .from("recovery_plan_revisions")
    .insert({
      project_id: projectId,
      revision_number: nextNumber,
      title: `Recovery Plan Rev.${nextNumber}`,
      status: "DRAFT",
      issue_date: new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeRevision(data);
}

export async function updateRecoveryRevision(revision) {
  const { data, error } = await supabase
    .from("recovery_plan_revisions")
    .update({
      title: revision.title || "Recovery Plan",
      status: revision.status || "DRAFT",
      issue_date: revision.issueDate || new Date().toISOString().slice(0, 10),
      general_note: revision.generalNote || null,
      actual_progress_snapshot: Number(revision.actualProgressSnapshot || 0),
      planned_progress_snapshot: Number(revision.plannedProgressSnapshot || 0),
      actual_qty_snapshot: Number(revision.actualQtySnapshot || 0),
      remaining_qty_snapshot: Number(revision.remainingQtySnapshot || 0),
      forecast_finish_snapshot: revision.forecastFinishSnapshot || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", revision.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeRevision(data);
}

export async function activateRecoveryRevision(projectId, revisionId) {
  if (!projectId || !revisionId) throw new Error("Recovery revision is required");

  const reset = await supabase
    .from("recovery_plan_revisions")
    .update({ status: "DRAFT", updated_at: new Date().toISOString() })
    .eq("project_id", projectId);

  if (reset.error) throw new Error(reset.error.message);

  const { data, error } = await supabase
    .from("recovery_plan_revisions")
    .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
    .eq("id", revisionId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeRevision(data);
}

export async function loadRecoveryItems(revisionId) {
  if (!revisionId) return [];

  const { data, error } = await supabase
    .from("recovery_plan_items")
    .select("*")
    .eq("revision_id", revisionId);

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeItem);
}

export async function saveRecoveryItems(revision, items) {
  if (!revision?.id) throw new Error("Recovery revision is required");

  const rows = items
    .filter((item) => item.activityId)
    .map((item) => ({
      revision_id: revision.id,
      project_id: revision.projectId,
      wbs_activity_id: item.activityId,
      forecast_start: item.forecastStart || null,
      forecast_finish: item.forecastFinish || null,
      forecast_note: item.forecastNote || null,
      updated_at: new Date().toISOString(),
    }));

  if (!rows.length) return [];

  const { data, error } = await supabase
    .from("recovery_plan_items")
    .upsert(rows, { onConflict: "revision_id,wbs_activity_id" })
    .select("*");

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeItem);
}

export async function loadActiveRecoveryRevision(projectId) {
  const revisions = await loadRecoveryRevisions(projectId);
  return revisions.find((item) => item.status === "ACTIVE") || revisions[0] || null;
}
