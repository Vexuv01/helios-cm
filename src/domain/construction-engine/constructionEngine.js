import {
  buildDecisionFeed,
  calculateCriticalActivities,
  calculateDisciplineProgress,
  calculateForecast,
  calculateHealth,
  calculateProgress,
  calculateWeeklyProduction,
} from "../construction-intelligence";

export function runConstructionEngine({ project = null, activities = [] } = {}) {
  const progress = calculateProgress(activities);
  const disciplineProgress = calculateDisciplineProgress(progress.activities);
  const criticalActivities = calculateCriticalActivities(progress.activities);

  const health = calculateHealth({
    progress,
    criticalActivities,
    disciplines: disciplineProgress,
  });

  const weeklyProduction = calculateWeeklyProduction(progress.activities);

  const forecast = calculateForecast({
    project,
    progress,
    health,
  });

  const decisionFeed = buildDecisionFeed({
    health,
    criticalActivities,
    disciplines: disciplineProgress,
    forecast,
  });

  return {
    activities: progress.activities,

    totals: progress.totals,

    overallProgress: progress.overallProgress,
    earnedWeight: progress.earnedWeight,
    remainingWeight: progress.remainingWeight,

    disciplineProgress,
    disciplines: disciplineProgress,

    criticalActivities,

    healthScore: health.score,
    healthStatus: health.status,
    delayRisk: health.delayRisk,
    healthReasons: health.reasons,

    weeklyProduction,
    forecast,
    decisionFeed,
  };
}

export function buildConstructionSnapshot(activities = []) {
  return runConstructionEngine({ activities });
}
