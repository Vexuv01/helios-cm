import { buildConstructionSnapshot as buildSnapshotContract } from "../domain/constructionSnapshot";
import { buildConstructionSnapshot as runConstructionEngine } from "../domain/construction-engine";
import { supabase } from "../lib/supabaseClient";
import { getProjects } from "../repositories/projectRepository";
import { listWbsActivities } from "../features/wbs/repositories/wbsRepository";

function mapWeeklyReport(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    status: row.status,
    notes: row.notes ?? "",
  };
}

async function getProjectById(projectId) {
  const projects = await getProjects();
  return projects.find((project) => project.id === projectId) ?? null;
}

async function listWeeklyReportsByProject(projectId) {
  const result = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("week_start", { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.map(mapWeeklyReport);
}

export async function getConstructionSnapshot(projectId) {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  const wbsActivities = await listWbsActivities(projectId);
  const weeklyReports = await listWeeklyReportsByProject(projectId);

  const engine = runConstructionEngine(wbsActivities);
  const lastWeekly = weeklyReports[0] ?? null;

  return buildSnapshotContract({
    project,
    engine,
    lastWeekly,
  });
}
