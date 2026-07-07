function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

export function calculateActivityProgress(activity) {
  const baseline = Number(activity.baselineQuantity || 0);
  const installed = Number(activity.installedQuantity || 0);

  if (baseline <= 0) return 0;

  return clamp((installed / baseline) * 100);
}

export function enrichActivities(activities = []) {
  return activities.map((activity) => {
    const baselineQuantity = Number(activity.baselineQuantity || 0);
    const installedQuantity = Number(activity.installedQuantity || 0);
    const weightPercent = Number(activity.weightPercent || 0);
    const progress = calculateActivityProgress(activity);
    const earnedWeight = (progress / 100) * weightPercent;

    return {
      ...activity,
      baselineQuantity,
      installedQuantity,
      weightPercent,
      progress,
      earnedWeight,
      remainingQuantity: Math.max(baselineQuantity - installedQuantity, 0),
      isCritical: weightPercent > 0 && progress < 35,
    };
  });
}

export function calculateProgress(activities = []) {
  const enrichedActivities = enrichActivities(activities);

  const totals = enrichedActivities.reduce(
    (acc, activity) => {
      acc.baselineQuantity += activity.baselineQuantity;
      acc.installedQuantity += activity.installedQuantity;
      acc.weightPercent += activity.weightPercent;
      acc.earnedWeight += activity.earnedWeight;
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
  };
}
