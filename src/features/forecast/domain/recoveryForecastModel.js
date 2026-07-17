const ACTUAL_WEEKLY_STATUSES = new Set(["SUBMITTED", "VALIDATED", "APPROVED", "LOCKED"]);

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function iso(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function getEntryQty(entry) {
  return toNumber(
    entry.actual_quantity ??
      entry.installed_quantity ??
      entry.produced_quantity ??
      entry.quantity ??
      entry.qty ??
      0
  );
}

export function getEntryActivityId(entry) {
  return entry.wbs_activity_id || entry.activity_id || entry.wbs_id || "";
}

export function isActualReport(report) {
  return ACTUAL_WEEKLY_STATUSES.has(String(report.status || "").toUpperCase());
}

export function buildActualQtyMap(entries) {
  return entries.reduce((acc, entry) => {
    const activityId = getEntryActivityId(entry);
    if (!activityId) return acc;
    acc[activityId] = toNumber(acc[activityId]) + getEntryQty(entry);
    return acc;
  }, {});
}

export function buildRecentWeeklyQtyMap(reports, entries, weeksCount = 4) {
  const recentReports = [...reports]
    .filter(isActualReport)
    .sort((a, b) => String(b.week_start || "").localeCompare(String(a.week_start || "")))
    .slice(0, weeksCount);

  const reportIds = new Set(recentReports.map((report) => report.id));
  const divisor = Math.max(recentReports.length, 1);

  return entries
    .filter((entry) => reportIds.has(entry.weekly_report_id))
    .reduce((acc, entry) => {
      const activityId = getEntryActivityId(entry);
      if (!activityId) return acc;
      acc[activityId] = toNumber(acc[activityId]) + getEntryQty(entry) / divisor;
      return acc;
    }, {});
}

export function daysBetween(start, finish) {
  if (!start || !finish) return 0;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${finish}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function remainingDays(forecastFinish) {
  if (!forecastFinish) return 0;
  return Math.max(0, daysBetween(iso(new Date()), forecastFinish));
}

export function productivityGap(requiredWeekly, currentWeekly) {
  const required = toNumber(requiredWeekly);
  const current = toNumber(currentWeekly);
  if (required <= 0) return 0;
  return Number((((required - current) / required) * 100).toFixed(1));
}

export function productivityRisk(requiredWeekly, currentWeekly) {
  const required = toNumber(requiredWeekly);
  const current = toNumber(currentWeekly);

  if (required <= 0) return "OK";
  if (current >= required) return "OK";

  const gap = ((required - current) / required) * 100;
  if (gap <= 10) return "LOW";
  if (gap <= 25) return "MEDIUM";
  return "HIGH";
}

export function mergeRows(activities, forecastItems, actualQtyMap, weeklyProductivityMap = {}) {
  const forecastByActivity = new Map(forecastItems.map((item) => [item.activityId, item]));

  return activities.map((activity) => {
    const forecast = forecastByActivity.get(activity.id);
    const baselineQuantity = toNumber(activity.baseline_quantity);
    const actualQuantity = toNumber(actualQtyMap[activity.id]);
    const remainingQuantity = Math.max(0, baselineQuantity - actualQuantity);

    return {
      activityId: activity.id,
      code: activity.code || "",
      name: activity.name || "",
      discipline: activity.discipline || "GENERAL",
      unit: activity.unit || "",
      baselineQuantity,
      actualQuantity,
      remainingQuantity,
      currentWeeklyProductivity: Number(toNumber(weeklyProductivityMap[activity.id]).toFixed(2)),
      weightPercent: toNumber(activity.weight_percent),
      plannedStart: iso(activity.planned_start),
      plannedFinish: iso(activity.planned_finish),
      forecastStart: forecast?.forecastStart || "",
      forecastFinish: forecast?.forecastFinish || "",
      forecastNote: forecast?.forecastNote || "",
      sortOrder: toNumber(activity.sort_order),
    };
  });
}

export function buildRecoveryMetrics(rows) {
  const totalActivities = rows.length;
      const forecasted = rows.filter((row) => row.forecastStart && row.forecastFinish).length;
  
      const totalWeight = rows.reduce((sum, row) => sum + toNumber(row.weightPercent), 0);
      const forecastedWeight = rows
        .filter((row) => row.forecastStart && row.forecastFinish)
        .reduce((sum, row) => sum + toNumber(row.weightPercent), 0);
  
      const totalBaselineQty = rows.reduce((sum, row) => sum + toNumber(row.baselineQuantity), 0);
      const totalActualQty = rows.reduce((sum, row) => sum + toNumber(row.actualQuantity), 0);
      const totalRemainingQty = rows.reduce((sum, row) => sum + toNumber(row.remainingQuantity), 0);
  
      const baselineFinish = rows.map((row) => row.plannedFinish).filter(Boolean).sort().at(-1);
  
      const forecastFinish = rows
        .map((row) => row.forecastFinish || row.plannedFinish)
        .filter(Boolean)
        .sort()
        .at(-1);
  
      const highRiskActivities = rows.filter((row) => {
        const weeks = row.forecastFinish ? Math.max(1, Math.ceil(remainingDays(row.forecastFinish) / 7)) : 0;
        const required = weeks > 0 ? row.remainingQuantity / weeks : 0;
        return productivityRisk(required, row.currentWeeklyProductivity) === "HIGH";
      }).length;
  
      return {
        totalActivities,
        forecasted,
        totalWeight: Number(totalWeight.toFixed(2)),
        forecastedWeight: Number(forecastedWeight.toFixed(2)),
        totalBaselineQty: Number(totalBaselineQty.toFixed(2)),
        totalActualQty: Number(totalActualQty.toFixed(2)),
        totalRemainingQty: Number(totalRemainingQty.toFixed(2)),
        baselineFinish: baselineFinish || "—",
        forecastFinish: forecastFinish || "—",
        highRiskActivities,
      };
}
