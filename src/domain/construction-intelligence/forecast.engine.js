function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

export function calculateForecast({ project, progress, health }) {
  const overallProgress = Number(progress?.overallProgress || 0);
  const remainingWeight = Number(progress?.remainingWeight || 0);
  const healthScore = Number(health?.score || 0);

  const productivityFactor = overallProgress >= 75 ? 1.1 : overallProgress >= 35 ? 1 : 0.85;
  const recoveryIndex = clamp(Math.round((healthScore * productivityFactor + overallProgress) / 2));

  const varianceDays =
    health?.delayRisk === "HIGH" ? 21 : health?.delayRisk === "MEDIUM" ? 10 : 0;

  return {
    plannedCOD: project?.plannedCOD ?? null,
    forecastCOD: project?.forecastCOD ?? project?.plannedCOD ?? null,
    varianceDays,
    confidence: clamp(Math.round((healthScore + recoveryIndex) / 2)),
    weeklyVelocity: Number((overallProgress / 4).toFixed(2)),
    remainingWeight,
    recoveryIndex,
  };
}
