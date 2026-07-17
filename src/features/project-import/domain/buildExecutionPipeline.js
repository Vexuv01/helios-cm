export function buildExecutionPipeline(plan) {
  const steps = [];

  if (plan.importBaseline) {
    steps.push({
      id: "baseline",
      label: "Import WBS Baseline",
      enabled: true,
    });
  }

  if (plan.importWeekly) {
    steps.push({
      id: "weekly",
      label: "Import Weekly Production",
      enabled: true,
    });
  }

  if (plan.importForecast) {
    steps.push({
      id: "forecast",
      label: "Import Forecast",
      enabled: true,
    });
  }

  if (plan.refreshDashboard) {
    steps.push({
      id: "dashboard",
      label: "Refresh Dashboard",
      enabled: true,
    });
  }

  if (plan.refreshPortfolio) {
    steps.push({
      id: "portfolio",
      label: "Refresh Portfolio",
      enabled: true,
    });
  }

  return steps;
}
