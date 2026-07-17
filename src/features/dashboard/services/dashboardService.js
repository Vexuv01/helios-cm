import { loadRealConstructionDashboard } from "../../../services/constructionEngine.service";
import { loadProjectCashFlowSnapshot } from "../../cash-flow/services/cashFlowDashboardService";
import { listConstructionProjects } from "../repositories/constructionDashboardRepository";

export async function loadDashboardProjects() {
  return listConstructionProjects();
}

export async function loadProjectDashboardSnapshot(projectId) {
  if (!projectId) return null;

  const [constructionDashboard, cashOut] =
    await Promise.all([
      loadRealConstructionDashboard(projectId),
      loadProjectCashFlowSnapshot(projectId),
    ]);

  return {
    ...constructionDashboard,
    cashOut,
  };
}
