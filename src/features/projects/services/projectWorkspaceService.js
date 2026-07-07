import { supabase } from "../../../lib/supabaseClient";

export async function getProjectWorkspace(projectId) {
  if (!projectId) {
    throw new Error("Project id is required");
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
