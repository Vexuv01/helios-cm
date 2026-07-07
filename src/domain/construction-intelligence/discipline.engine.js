function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

export function calculateDisciplineProgress(activities = []) {
  const grouped = activities.reduce((acc, activity) => {
    const key = activity.discipline || "GENERAL";

    if (!acc[key]) {
      acc[key] = {
        discipline: key,
        activities: 0,
        weightPercent: 0,
        earnedWeight: 0,
        installedQuantity: 0,
        baselineQuantity: 0,
      };
    }

    acc[key].activities += 1;
    acc[key].weightPercent += Number(activity.weightPercent || 0);
    acc[key].earnedWeight += Number(activity.earnedWeight || 0);
    acc[key].installedQuantity += Number(activity.installedQuantity || 0);
    acc[key].baselineQuantity += Number(activity.baselineQuantity || 0);

    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      progress:
        item.weightPercent > 0
          ? clamp((item.earnedWeight / item.weightPercent) * 100)
          : 0,
      remainingWeight: Math.max(item.weightPercent - item.earnedWeight, 0),
    }))
    .sort((a, b) => b.weightPercent - a.weightPercent);
}
