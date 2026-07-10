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
  const existing = await loadRecoveryRevisions(projectId);
  const nextRevisionNumber =
    existing.length > 0
      ? Math.max(...existing.map((item) => Number(item.revisionNumber || 0))) + 1
      : 1;

  const { data, error } = await supabase
    .from("recovery_plan_revisions")
    .insert({
      project_id: projectId,
      revision_number: nextRevisionNumber,
      title: `Recovery Plan Rev.${nextRevisionNumber}`,
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", revision.id)
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
