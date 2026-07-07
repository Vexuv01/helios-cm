function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

function calculateActivityProgress(activity) {
  const baseline = Number(activity.baselineQuantity || 0);
  const installed = Number(activity.installedQuantity || 0);

  if (baseline <= 0) return 0;

  return clamp((installed / baseline) * 100);
}

function enrichActivity(activity) {
  const progress = calculateActivityProgress(activity);
  const weight = Number(activity.weightPercent || 0);
  const earnedWeight = (progress / 100) * weight;
  const baselineQuantity = Number(activity.baselineQuantity || 0);
  const installedQuantity = Number(activity.installedQuantity || 0);

  return {
    ...activity,
    baselineQuantity,
    installedQuantity,
    weightPercent: weight,
    progress,
    earnedWeight,
    remainingQuantity: Math.max(baselineQuantity - installedQuantity, 0),
    isCritical: weight > 0 && progress < 35,
  };
}

function buildDisciplineProgress(activities) {
  const grouped = activities.reduce((acc, activity) => {
    const key = activity.discipline || "GENERAL";

    if (!acc[key]) {
      acc[key] = {
        discipline: key,
        activities: 0,
        weightPercent: 0,
        earnedWeight: 0,
      };
    }

    acc[key].activities += 1;
    acc[key].weightPercent += Number(activity.weightPercent || 0);
    acc[key].earnedWeight += Number(activity.earnedWeight || 0);

    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      progress:
        item.weightPercent > 0
          ? clamp((item.earnedWeight / item.weightPercent) * 100)
          : 0,
    }))
    .sort((a, b) => b.weightPercent - a.weightPercent);
}

function calculateHealthScore({ overallProgress, criticalActivities }) {
  const criticalPenalty = Math.min(criticalActivities.length * 8, 40);
  const progressPenalty = overallProgress < 10 ? 15 : 0;

  return clamp(100 - criticalPenalty - progressPenalty);
}

function calculateDelayRisk({ healthScore, criticalActivities }) {
  if (healthScore < 50 || criticalActivities.length >= 5) return "HIGH";
  if (healthScore < 75 || criticalActivities.length >= 3) return "MEDIUM";
  return "LOW";
}

function buildWeeklyProduction(activities) {
  const updatedActivities = activities.filter(
    (activity) => Number(activity.installedQuantity || 0) > 0
  );

  return {
    installedQuantity: updatedActivities.reduce(
      (sum, activity) => sum + Number(activity.installedQuantity || 0),
      0
    ),
    earnedWeight: activities.reduce(
      (sum, activity) => sum + Number(activity.earnedWeight || 0),
      0
    ),
    activitiesUpdated: updatedActivities.length,
  };
}

function buildForecast({ project, overallProgress, healthScore }) {
  return {
    plannedCOD: project?.plannedCOD ?? null,
    forecastCOD: project?.forecastCOD ?? project?.plannedCOD ?? null,
    varianceDays: 0,
    confidence: clamp(Math.round((healthScore + overallProgress) / 2)),
  };
}

export function runConstructionEngine({ project = null, activities = [] } = {}) {
  const enrichedActivities = activities.map(enrichActivity);

  const totals = enrichedActivities.reduce(
    (acc, activity) => {
      acc.baselineQuantity += Number(activity.baselineQuantity || 0);
      acc.installedQuantity += Number(activity.installedQuantity || 0);
      acc.weightPercent += Number(activity.weightPercent || 0);
      acc.earnedWeight += Number(activity.earnedWeight || 0);
      return acc;
    },
    {
      baselineQuantity: 0,
      installedQuantity: 0,
      weightPercent: 0,
      earnedWeight: 0,
    }
  );

  const overallProgress =
    totals.weightPercent > 0
      ? clamp((totals.earnedWeight / totals.weightPercent) * 100)
      : 0;

  const disciplineProgress = buildDisciplineProgress(enrichedActivities);

  const criticalActivities = enrichedActivities
    .filter((activity) => activity.isCritical)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 5);

  const healthScore = calculateHealthScore({
    overallProgress,
    criticalActivities,
  });

  const delayRisk = calculateDelayRisk({
    healthScore,
    criticalActivities,
  });

  const weeklyProduction = buildWeeklyProduction(enrichedActivities);

  const forecast = buildForecast({
    project,
    overallProgress,
    healthScore,
  });

  return {
    activities: enrichedActivities,

    totals: {
      ...totals,
      progress: overallProgress,
      remainingWeight: Math.max(totals.weightPercent - totals.earnedWeight, 0),
    },

    overallProgress,
    earnedWeight: totals.earnedWeight,
    remainingWeight: Math.max(totals.weightPercent - totals.earnedWeight, 0),

    disciplineProgress,
    disciplines: disciplineProgress,

    criticalActivities,

    healthScore,
    delayRisk,

    weeklyProduction,
    forecast,
  };
}

export function buildConstructionSnapshot(activities = []) {
  return runConstructionEngine({ activities });
}
