export function buildDecisionFeed({ health, criticalActivities, disciplines, forecast }) {
  const decisions = [];

  if (health.delayRisk === "HIGH") {
    decisions.push({
      type: "RISK",
      severity: "HIGH",
      title: "High delay risk detected",
      message: "Review recovery plan and focus on critical path activities.",
    });
  }

  if (criticalActivities.length > 0) {
    const first = criticalActivities[0];

    decisions.push({
      type: "ACTION",
      severity: criticalActivities.length >= 5 ? "HIGH" : "MEDIUM",
      title: "Critical activity requires attention",
      message: `${first.code} · ${first.name} is at ${Number(first.progress || 0).toFixed(1)}% progress.`,
    });
  }

  const weakestDiscipline = [...disciplines].sort(
    (a, b) => Number(a.progress || 0) - Number(b.progress || 0)
  )[0];

  if (weakestDiscipline) {
    decisions.push({
      type: "INSIGHT",
      severity: Number(weakestDiscipline.progress || 0) < 35 ? "MEDIUM" : "LOW",
      title: "Weakest discipline",
      message: `${weakestDiscipline.discipline} is currently at ${Number(
        weakestDiscipline.progress || 0
      ).toFixed(1)}% progress.`,
    });
  }

  if (Number(forecast?.varianceDays || 0) > 0) {
    decisions.push({
      type: "FORECAST",
      severity: forecast.varianceDays > 14 ? "HIGH" : "MEDIUM",
      title: "Forecast variance detected",
      message: `Current risk profile indicates a potential ${forecast.varianceDays} day variance.`,
    });
  }

  if (decisions.length === 0) {
    decisions.push({
      type: "STATUS",
      severity: "LOW",
      title: "No major construction blockers",
      message: "Current WBS production data does not indicate immediate action items.",
    });
  }

  return decisions;
}
