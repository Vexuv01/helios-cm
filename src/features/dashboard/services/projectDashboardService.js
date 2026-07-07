import { loadProjectWbs } from "../../wbs/services/wbsService";

function calculateHealthScore(snapshot) {
  const progress = Number(snapshot.totals.progress || 0);
  const weightCompleteness = Number(snapshot.totals.weightPercent || 0);
  const criticalCount = snapshot.criticalActivities.length;

  let score = 100;

  if (weightCompleteness < 95) score -= 15;
  if (criticalCount >= 1) score -= criticalCount * 7;
  if (progress < 10 && snapshot.activities.length > 0) score -= 10;

  return Math.max(Math.min(Math.round(score), 100), 0);
}

function getHealthStatus(score) {
  if (score >= 85) return "HEALTHY";
  if (score >= 65) return "WATCH";
  return "CRITICAL";
}

export async function loadProjectDashboard(projectId) {
  const snapshot = await loadProjectWbs(projectId);
  const healthScore = calculateHealthScore(snapshot);

  return {
    ...snapshot,
    health: {
      score: healthScore,
      status: getHealthStatus(healthScore),
    },
  };
}
