import { createConstructionSnapshot } from "./constructionSnapshot.model";

export function buildConstructionSnapshot({
  project,
  engine,
  lastWeekly,
}) {
  return createConstructionSnapshot({
    project,

    overallProgress: engine?.overallProgress ?? 0,
    earnedWeight: engine?.earnedWeight ?? 0,

    healthScore: engine?.healthScore ?? 0,
    delayRisk: engine?.delayRisk ?? "LOW",

    disciplineProgress: engine?.disciplineProgress ?? [],

    weeklyProduction: {
      installedQuantity: engine?.weeklyProduction?.installedQuantity ?? 0,
      earnedWeight: engine?.weeklyProduction?.earnedWeight ?? 0,
      activitiesUpdated: engine?.weeklyProduction?.activitiesUpdated ?? 0,
    },

    criticalActivities: engine?.criticalActivities ?? [],

    forecast: {
      plannedCOD: engine?.forecast?.plannedCOD ?? null,
      forecastCOD: engine?.forecast?.forecastCOD ?? null,
      varianceDays: engine?.forecast?.varianceDays ?? 0,
      confidence: engine?.forecast?.confidence ?? 100,
    },

    lastWeekly: {
      weekNumber: lastWeekly?.weekNumber ?? null,
      reportDate: lastWeekly?.reportDate ?? null,
      status: lastWeekly?.status ?? null,
    },
  });
}
