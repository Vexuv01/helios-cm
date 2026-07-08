import {
  buildDecisionFeed,
  calculateCriticalActivities,
  calculateDisciplineProgress,
  calculateForecast,
  calculateHealth,
  calculateProgress,
  calculateTimeline,
  calculateWeeklyProduction,
} from "../construction-intelligence";

export function runConstructionEngine({ project = null, activities = [] } = {}) {
  const progress = calculateProgress(activities);
  const disciplineProgress = calculateDisciplineProgress(progress.activities);
  const criticalActivities = calculateCriticalActivities(progress.activities);

  const timeline = calculateTimeline({
    project,
    activities: progress.activities,
    progress,
  });

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
    timeline,
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
    plannedProgress: progress.plannedProgress,
    scheduleVariance: progress.scheduleVariance,
    earnedWeight: progress.earnedWeight,
    plannedWeight: progress.plannedWeight,
    remainingWeight: progress.remainingWeight,

    disciplineProgress,
    disciplines: disciplineProgress,
    criticalActivities,

    timeline,

    healthScore: health.score,
    healthStatus: health.status,
    delayRisk: timeline.milestoneRisk ?? health.delayRisk,
    healthReasons: health.reasons,

    weeklyProduction,
    forecast,
    decisionFeed,
  };
}

export function buildConstructionSnapshot(activities = []) {
  return runConstructionEngine({ activities });
}
