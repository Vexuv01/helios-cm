function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start, finish) {
  if (!start || !finish) return 0;
  return Math.max(Math.ceil((finish.getTime() - start.getTime()) / 86400000), 0);
}

export function calculateActivityProgress(activity) {
  const baseline = Number(activity.baselineQuantity || 0);
  const installed = Number(activity.installedQuantity || 0);

  if (baseline <= 0) return 0;

  return clamp((installed / baseline) * 100);
}

export function calculatePlannedActivityProgress(activity, today = new Date()) {
  const start = parseDate(activity.plannedStart);
  const finish = parseDate(activity.plannedFinish);

  if (!start || !finish) return 0;
  if (today < start) return 0;
  if (today >= finish) return 100;

  const totalDays = daysBetween(start, finish);
  const elapsedDays = daysBetween(start, today);

  if (totalDays <= 0) return 100;

  return clamp((elapsedDays / totalDays) * 100);
}

export function enrichActivities(activities = [], today = new Date()) {
  return activities.map((activity) => {
    const baselineQuantity = Number(activity.baselineQuantity || 0);
    const installedQuantity = Number(activity.installedQuantity || 0);
    const weightPercent = Number(activity.weightPercent || 0);

    const progress = calculateActivityProgress(activity);
    const plannedProgress = calculatePlannedActivityProgress(activity, today);

    const earnedWeight = (progress / 100) * weightPercent;
    const plannedWeight = (plannedProgress / 100) * weightPercent;
    const variance = progress - plannedProgress;

    return {
      ...activity,
      baselineQuantity,
      installedQuantity,
      weightPercent,
      progress,
      plannedProgress,
      variance,
      earnedWeight,
      plannedWeight,
      remainingQuantity: Math.max(baselineQuantity - installedQuantity, 0),
      isCritical:
        weightPercent > 0 &&
        plannedProgress >= 20 &&
        progress < plannedProgress - 10 &&
        progress < 100,
    };
  });
}

export function calculateProgress(activities = []) {
  const today = new Date();
  const enrichedActivities = enrichActivities(activities, today);

  const totals = enrichedActivities.reduce(
    (acc, activity) => {
      acc.baselineQuantity += activity.baselineQuantity;
      acc.installedQuantity += activity.installedQuantity;
      acc.weightPercent += activity.weightPercent;
      acc.earnedWeight += activity.earnedWeight;
      acc.plannedWeight += activity.plannedWeight;
      return acc;
    },
    {
      baselineQuantity: 0,
      installedQuantity: 0,
      weightPercent: 0,
      earnedWeight: 0,
      plannedWeight: 0,
    }
  );

  const overallProgress =
    totals.weightPercent > 0 ? clamp((totals.earnedWeight / totals.weightPercent) * 100) : 0;

  const plannedProgress =
    totals.weightPercent > 0 ? clamp((totals.plannedWeight / totals.weightPercent) * 100) : 0;

  const scheduleVariance = overallProgress - plannedProgress;

  return {
    activities: enrichedActivities,
    totals: {
      ...totals,
      progress: overallProgress,
      plannedProgress,
      scheduleVariance,
      remainingWeight: Math.max(totals.weightPercent - totals.earnedWeight, 0),
    },
    overallProgress,
    plannedProgress,
    scheduleVariance,
    earnedWeight: totals.earnedWeight,
    plannedWeight: totals.plannedWeight,
    remainingWeight: Math.max(totals.weightPercent - totals.earnedWeight, 0),
  };
}
