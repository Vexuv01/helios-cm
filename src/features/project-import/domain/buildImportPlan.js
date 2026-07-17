export function buildImportPlan(summary) {
  return {
    importBaseline: summary.hasBaseline,
    importWeekly: summary.hasWeekly,
    importForecast: summary.hasForecast,
    refreshDashboard: true,
    refreshPortfolio: true,
    warnings: [],
  };
}
