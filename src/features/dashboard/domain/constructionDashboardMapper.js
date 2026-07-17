function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

export function mapConstructionProject(row) {
  return {
    id: row.id,
    code: row.code || "",
    name: row.name || "",
    status: row.status || null,
    startDate: isoDate(row.start_date),
    plannedCOD: isoDate(row.planned_cod),
    forecastCOD: isoDate(row.forecast_cod),
  };
}

export function mapConstructionActivity(
  row,
  installedQuantity,
  forecast = null
) {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code || "",
    name: row.name || "",
    discipline: row.discipline || "GENERAL",
    unit: row.unit || "nr",
    baselineQuantity: numberValue(row.baseline_quantity),
    installedQuantity: numberValue(installedQuantity),
    weightPercent: numberValue(row.weight_percent),
    plannedStart: isoDate(row.planned_start),
    plannedFinish: isoDate(row.planned_finish),
    forecastStart: isoDate(forecast?.forecast_start),
    forecastFinish: isoDate(forecast?.forecast_finish),
    forecastNote: forecast?.forecast_note || "",
    recoveryIssueDate: isoDate(forecast?.recovery_issue_date),
    recoveryRevisionNumber:
      forecast?.recovery_revision_number || null,
    recoveryStatus: forecast?.recovery_status || "",
    actualStart: isoDate(row.actual_start),
    actualFinish: isoDate(row.actual_finish),
    status: row.status || "BASELINE",
    sortOrder: numberValue(row.sort_order),
    isGroup: Boolean(row.is_group),
  };
}
