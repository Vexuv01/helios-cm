export function createConstructionSnapshot({
  project,

  overallProgress = 0,
  plannedProgress = 0,
  scheduleVariance = 0,
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

  timeline = {
    today: null,
    plannedStart: null,
    plannedFinish: null,
    actualStart: null,
    actualFinish: null,
    delayDays: 0,
    overdueActivities: [],
    upcomingActivities: [],
    lookAhead: [],
    milestoneRisk: "LOW",
    forecastCOD: null,
    activities: [],
  },

  forecast = {
    plannedCOD: null,
    forecastCOD: null,
    varianceDays: 0,
    confidence: 100,
    weeklyVelocity: 0,
    remainingWeight: 0,
    recoveryIndex: 100,
    milestoneRisk: "LOW",
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
      plannedProgress,
      scheduleVariance,
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
    timeline,
    forecast,
    decisionFeed,
    lastWeekly,
  };
}
