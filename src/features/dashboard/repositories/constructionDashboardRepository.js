import { supabase } from "../../../lib/supabaseClient";

function assertResult(result, fallbackMessage) {
  if (result.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result.data;
}

export async function getConstructionProject(projectId) {
  if (!projectId) {
    throw new Error("Project id is required");
  }

  const result = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  return assertResult(
    result,
    "Unable to load construction project"
  );
}

export async function listConstructionWbsActivities(projectId) {
  if (!projectId) return [];

  const result = await supabase
    .from("wbs_activities")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  return (
    assertResult(
      result,
      "Unable to load construction WBS activities"
    ) || []
  );
}

export async function listConstructionWeeklyReports(projectId) {
  if (!projectId) return [];

  const result = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("week_start", { ascending: true });

  return (
    assertResult(
      result,
      "Unable to load construction Weekly reports"
    ) || []
  );
}

export async function listConstructionWeeklyEntries(reportIds) {
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from("weekly_entries")
    .select("*")
    .in("weekly_report_id", reportIds);

  return (
    assertResult(
      result,
      "Unable to load construction Weekly entries"
    ) || []
  );
}

export async function getConstructionRecoveryForecast(projectId) {
  if (!projectId) {
    return {
      revision: null,
      items: [],
    };
  }

  const revisionsResult = await supabase
    .from("recovery_plan_revisions")
    .select("*")
    .eq("project_id", projectId)
    .order("revision_number", { ascending: false });

  const revisions =
    assertResult(
      revisionsResult,
      "Unable to load Recovery revisions"
    ) || [];

  const activeRevision =
    revisions.find((revision) => revision.status === "ACTIVE") ||
    revisions[0] ||
    null;

  if (!activeRevision) {
    return {
      revision: null,
      items: [],
    };
  }

  const itemsResult = await supabase
    .from("recovery_plan_items")
    .select("*")
    .eq("revision_id", activeRevision.id);

  return {
    revision: activeRevision,
    items:
      assertResult(
        itemsResult,
        "Unable to load Recovery items"
      ) || [],
  };
}

export async function listConstructionProjects() {
  const result = await supabase
    .from("projects")
    .select("*")
    .order("code", { ascending: true });

  return (
    assertResult(
      result,
      "Unable to load construction projects"
    ) || []
  );
}
