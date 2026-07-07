export function calculateWeeklyProduction(activities = []) {
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
    totalActivities: activities.length,
  };
}
