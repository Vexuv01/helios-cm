import { supabase } from "../../../lib/supabaseClient";
import { buildExecutivePortfolioReport } from "../../../domain/reporting/executiveReportEngine";
import { renderWeeklyManagementPpt } from "../renderers/weeklyManagementPptRenderer";
import { loadLatestExecutiveNote } from "./executiveNotesService";

async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getWbs(projectId) {
  const { data, error } = await supabase
    .from("wbs_activities")
    .select("*")
    .eq("project_id", projectId);

  if (error) throw error;
  return data || [];
}

async function getWeeklyEntries(projectId) {
  const { data, error } = await supabase
    .from("weekly_entries")
    .select("*")
    .eq("project_id", projectId);

  if (error) return [];
  return data || [];
}

async function getRecovery(projectId) {
  const { data, error } = await supabase
    .from("recovery_plan_revisions")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_archived", false)
    .order("is_active", { ascending: false })
    .order("revision_number", { ascending: false })
    .limit(1);

  if (error) return null;
  return data?.[0] || null;
}

async function buildReportInput() {
  const projects = await getProjects();

  const enrichedProjects = await Promise.all(
    projects.map(async (project) => {
      const [wbs, weeklyEntries, recovery, executiveNotes] = await Promise.all([
        getWbs(project.id),
        getWeeklyEntries(project.id),
        getRecovery(project.id),
        loadLatestExecutiveNote(project.id).catch(() => null),
      ]);

      return {
        project,
        wbs,
        weeklyEntries,
        recovery,
        executiveNotes,
      };
    })
  );

  return { projects: enrichedProjects };
}

export async function generateWeeklyManagementPpt() {
  const reportInput = await buildReportInput();
  const report = buildExecutivePortfolioReport(reportInput);

  await renderWeeklyManagementPpt(report);

  return report;
}
