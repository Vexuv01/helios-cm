import { loadRealConstructionDashboard } from "../../../services/constructionEngine.service";
import { listConstructionProjects } from "../repositories/constructionDashboardRepository";

export async function loadDashboardProjects() {
  return listConstructionProjects();
}

export async function loadProjectDashboardSnapshot(projectId) {
  if (!projectId) return null;

  return loadRealConstructionDashboard(projectId);
}
