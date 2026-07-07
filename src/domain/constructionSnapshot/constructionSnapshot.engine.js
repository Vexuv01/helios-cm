import { createConstructionSnapshot } from "./constructionSnapshot.model";

export function buildConstructionSnapshot({ project, engine, lastWeekly }) {
  return createConstructionSnapshot({
    project,

    overallProgress: engine?.overallProgress ?? 0,
    earnedWeight: engine?.earnedWeight ?? 0,

    healthScore: engine?.healthScore ?? 0,
    healthStatus: engine?.healthStatus ?? "WATCH",
    delayRisk: engine?.delayRisk ?? "LOW",
    healthReasons: engine?.healthReasons ?? [],

    disciplineProgress: engine?.disciplineProgress ?? [],

    weeklyProduction: {
      installedQuantity: engine?.weeklyProduction?.installedQuantity ?? 0,
      earnedWeight: engine?.weeklyProduction?.earnedWeight ?? 0,
      activitiesUpdated: engine?.weeklyProduction?.activitiesUpdated ?? 0,
      totalActivities: engine?.weeklyProduction?.totalActivities ?? 0,
    },

    criticalActivities: engine?.criticalActivities ?? [],

    forecast: {
      plannedCOD: engine?.forecast?.plannedCOD ?? null,
      forecastCOD: engine?.forecast?.forecastCOD ?? null,
      varianceDays: engine?.forecast?.varianceDays ?? 0,
      confidence: engine?.forecast?.confidence ?? 100,
      weeklyVelocity: engine?.forecast?.weeklyVelocity ?? 0,
      remainingWeight: engine?.forecast?.remainingWeight ?? 0,
      recoveryIndex: engine?.forecast?.recoveryIndex ?? 100,
    },

    decisionFeed: engine?.decisionFeed ?? [],

    lastWeekly: {
      weekNumber: lastWeekly?.weekNumber ?? null,
      reportDate: lastWeekly?.weekStart ?? lastWeekly?.reportDate ?? null,
      status: lastWeekly?.status ?? null,
    },
  });
}
