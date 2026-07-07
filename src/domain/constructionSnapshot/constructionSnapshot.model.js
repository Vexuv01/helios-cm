export function createConstructionSnapshot({
  project,

  overallProgress = 0,
  earnedWeight = 0,

  healthScore = 0,
  delayRisk = "LOW",

  disciplineProgress = [],

  weeklyProduction = {
    installedQuantity: 0,
    earnedWeight: 0,
    activitiesUpdated: 0,
  },

  criticalActivities = [],

  forecast = {
    plannedCOD: null,
    forecastCOD: null,
    varianceDays: 0,
    confidence: 100,
  },

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
      delayRisk,
    },

    disciplines: disciplineProgress,

    weekly: weeklyProduction,

    criticalActivities,

    forecast,

    lastWeekly,
  };
}
