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

  return {
    ...activity,
    progress,
    earnedWeight,
    remainingQuantity: Math.max(
      Number(activity.baselineQuantity || 0) -
        Number(activity.installedQuantity || 0),
      0
    ),
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

export function buildConstructionSnapshot(activities = []) {
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

  const disciplines = buildDisciplineProgress(enrichedActivities);

  const criticalActivities = enrichedActivities
    .filter((activity) => activity.isCritical)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 5);

  return {
    activities: enrichedActivities,
    totals: {
      ...totals,
      progress: overallProgress,
      remainingWeight: Math.max(totals.weightPercent - totals.earnedWeight, 0),
    },
    disciplines,
    criticalActivities,
  };
}
