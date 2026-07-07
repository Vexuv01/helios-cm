export function createConstructionSnapshot({
  project,

  overallProgress = 0,
  earnedWeight = 0,

  healthScore = 0,
  healthStatus = "WATCH",
  delayRisk = "LOW",
  healthReasons = [],

  disciplineProgress = [],

  weeklyProduction = {
    installedQuantity: 0,
    earnedWeight: 0,
    activitiesUpdated: 0,
    totalActivities: 0,
  },

  criticalActivities = [],

  forecast = {
    plannedCOD: null,
    forecastCOD: null,
    varianceDays: 0,
    confidence: 100,
    weeklyVelocity: 0,
    remainingWeight: 0,
    recoveryIndex: 100,
  },

  decisionFeed = [],

  lastWeekly = {
    weekNumber: null,
    reportDate: null,
    status: null,
  },
}) {
  return {
    generatedAt: new Date().toISOString(),

    project,

    progress: {
      overallProgress,
      earnedWeight,
    },

    health: {
      score: healthScore,
      status: healthStatus,
      delayRisk,
      reasons: healthReasons,
    },

    disciplines: disciplineProgress,

    weekly: weeklyProduction,

    criticalActivities,

    forecast,

    decisionFeed,

    lastWeekly,
  };
}
