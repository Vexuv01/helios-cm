import { createConstructionSnapshot } from "./constructionSnapshot.model";

export function buildConstructionSnapshot({ project, engine, lastWeekly }) {
  return createConstructionSnapshot({
    project,

    overallProgress: engine?.overallProgress ?? 0,
    plannedProgress: engine?.plannedProgress ?? 0,
    scheduleVariance: engine?.scheduleVariance ?? 0,
    earnedWeight: engine?.earnedWeight ?? 0,

    healthScore: engine?.healthScore ?? 0,
    healthStatus: engine?.healthStatus ?? "WATCH",
    delayRisk: engine?.timeline?.milestoneRisk ?? engine?.delayRisk ?? "LOW",
    healthReasons: engine?.healthReasons ?? [],

    disciplineProgress: engine?.disciplineProgress ?? [],

    weeklyProduction: {
      installedQuantity: engine?.weeklyProduction?.installedQuantity ?? 0,
      earnedWeight: engine?.weeklyProduction?.earnedWeight ?? 0,
      activitiesUpdated: engine?.weeklyProduction?.activitiesUpdated ?? 0,
      totalActivities: engine?.weeklyProduction?.totalActivities ?? 0,
    },

    criticalActivities: engine?.criticalActivities ?? [],

    timeline: {
      today: engine?.timeline?.today ?? null,
      plannedStart: engine?.timeline?.plannedStart ?? null,
      plannedFinish: engine?.timeline?.plannedFinish ?? null,
      actualStart: engine?.timeline?.actualStart ?? null,
      actualFinish: engine?.timeline?.actualFinish ?? null,
      delayDays: engine?.timeline?.delayDays ?? 0,
      overdueActivities: engine?.timeline?.overdueActivities ?? [],
      upcomingActivities: engine?.timeline?.upcomingActivities ?? [],
      lookAhead: engine?.timeline?.lookAhead ?? [],
      milestoneRisk: engine?.timeline?.milestoneRisk ?? "LOW",
      forecastCOD: engine?.timeline?.forecastCOD ?? null,
      activities: engine?.timeline?.activities ?? [],
    },

    forecast: {
      plannedCOD: engine?.forecast?.plannedCOD ?? null,
      forecastCOD: engine?.timeline?.forecastCOD ?? engine?.forecast?.forecastCOD ?? null,
      varianceDays: engine?.forecast?.varianceDays ?? 0,
      confidence: engine?.forecast?.confidence ?? 100,
      weeklyVelocity: engine?.forecast?.weeklyVelocity ?? 0,
      remainingWeight: engine?.forecast?.remainingWeight ?? 0,
      recoveryIndex: engine?.forecast?.recoveryIndex ?? 100,
      milestoneRisk:
        engine?.forecast?.milestoneRisk ??
        engine?.timeline?.milestoneRisk ??
        "LOW",
    },

    decisionFeed: engine?.decisionFeed ?? [],

    lastWeekly: {
      weekNumber: lastWeekly?.weekNumber ?? null,
      reportDate: lastWeekly?.weekStart ?? lastWeekly?.reportDate ?? null,
      status: lastWeekly?.status ?? null,
    },
  });
}
