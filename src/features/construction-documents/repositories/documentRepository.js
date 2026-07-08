import { supabase } from "../../../lib/supabaseClient";

const TABLE = "construction_documents";

export async function getDocuments(projectId, activityId) {
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (activityId) {
    query = query.eq("wbs_activity_id", activityId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function createDocument(document) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(document)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteDocument(id) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateDocument(id, values) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}
