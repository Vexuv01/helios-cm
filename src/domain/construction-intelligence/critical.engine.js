export function calculateCriticalActivities(activities = []) {
  return activities
    .filter((activity) => Number(activity.weightPercent || 0) > 0)
    .filter((activity) => Number(activity.progress || 0) < 35)
    .sort((a, b) => {
      const progressDelta = Number(a.progress || 0) - Number(b.progress || 0);
      if (progressDelta !== 0) return progressDelta;
      return Number(b.weightPercent || 0) - Number(a.weightPercent || 0);
    })
    .slice(0, 8);
}
