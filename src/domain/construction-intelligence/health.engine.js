function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

export function calculateHealth({ progress, criticalActivities, disciplines }) {
  const overallProgress = Number(progress?.overallProgress || 0);
  const criticalCount = criticalActivities.length;

  const weakDisciplines = disciplines.filter(
    (discipline) =>
      Number(discipline.weightPercent || 0) >= 5 &&
      Number(discipline.progress || 0) < overallProgress - 15
  );

  const criticalPenalty = Math.min(criticalCount * 7, 35);
  const disciplinePenalty = Math.min(weakDisciplines.length * 8, 24);
  const earlyStagePenalty = overallProgress < 5 && criticalCount > 0 ? 10 : 0;

  const score = clamp(
    Math.round(100 - criticalPenalty - disciplinePenalty - earlyStagePenalty)
  );

  const status = score >= 80 ? "HEALTHY" : score >= 60 ? "WATCH" : "CRITICAL";
  const delayRisk = score >= 80 ? "LOW" : score >= 60 ? "MEDIUM" : "HIGH";

  const reasons = [];

  if (criticalCount > 0) {
    reasons.push(`${criticalCount} critical activities below threshold`);
  }

  if (weakDisciplines.length > 0) {
    reasons.push(
      `${weakDisciplines.length} disciplines are underperforming versus project average`
    );
  }

  if (reasons.length === 0) {
    reasons.push("Project progress is aligned with current WBS production data");
  }

  return {
    score,
    status,
    delayRisk,
    reasons,
  };
}
