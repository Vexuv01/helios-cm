import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  loadRecoveryForecast,
  saveRecoveryForecast,
} from "../../features/forecast/services/recoveryForecastService";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/forecast.css";

const ACTUAL_WEEKLY_STATUSES = new Set(["SUBMITTED", "VALIDATED", "APPROVED", "LOCKED"]);

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function iso(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getEntryQty(entry) {
  return toNumber(
    entry.actual_quantity ??
      entry.installed_quantity ??
      entry.produced_quantity ??
      entry.quantity ??
      entry.qty ??
      0
  );
}

function getEntryActivityId(entry) {
  return entry.wbs_activity_id || entry.activity_id || entry.wbs_id || "";
}

function isActualReport(report) {
  return ACTUAL_WEEKLY_STATUSES.has(String(report.status || "").toUpperCase());
}

function buildActualQtyMap(entries) {
  return entries.reduce((acc, entry) => {
    const activityId = getEntryActivityId(entry);
    if (!activityId) return acc;

    acc[activityId] = toNumber(acc[activityId]) + getEntryQty(entry);
    return acc;
  }, {});
}

function daysBetween(start, finish) {
  if (!start || !finish) return 0;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${finish}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function remainingDays(forecastFinish) {
  if (!forecastFinish) return 0;
  return Math.max(0, daysBetween(iso(new Date()), forecastFinish));
}

function mergeRows(activities, forecasts, actualQtyMap) {
  const forecastByActivity = new Map(forecasts.map((item) => [item.activityId, item]));

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
      weightPercent: toNumber(activity.weight_percent),
      plannedStart: iso(activity.planned_start),
      plannedFinish: iso(activity.planned_finish),
      forecastStart: forecast?.forecastStart || "",
      forecastFinish: forecast?.forecastFinish || "",
      forecastNote: forecast?.forecastNote || "",
      status: forecast?.status || "DRAFT",
      sortOrder: toNumber(activity.sort_order),
    };
  });
}

export default function ProjectForecast() {
  const params = useParams();
  const projectId = params.projectId || params.id || "";

  const [rows, setRows] = useState([]);
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const metrics = useMemo(() => {
    const totalActivities = rows.length;
    const forecasted = rows.filter((row) => row.forecastStart && row.forecastFinish).length;

    const totalWeight = rows.reduce((sum, row) => sum + toNumber(row.weightPercent), 0);
    const forecastedWeight = rows
      .filter((row) => row.forecastStart && row.forecastFinish)
      .reduce((sum, row) => sum + toNumber(row.weightPercent), 0);

    const totalBaselineQty = rows.reduce((sum, row) => sum + toNumber(row.baselineQuantity), 0);
    const totalActualQty = rows.reduce((sum, row) => sum + toNumber(row.actualQuantity), 0);
    const totalRemainingQty = rows.reduce((sum, row) => sum + toNumber(row.remainingQuantity), 0);

    const baselineFinish = rows
      .map((row) => row.plannedFinish)
      .filter(Boolean)
      .sort()
      .at(-1);

    const forecastFinish = rows
      .map((row) => row.forecastFinish || row.plannedFinish)
      .filter(Boolean)
      .sort()
      .at(-1);

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
    };
  }, [rows]);

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const [
        { data: activities, error: activitiesError },
        { data: weeklyReports, error: reportsError },
        forecasts,
      ] = await Promise.all([
        supabase
          .from("wbs_activities")
          .select("*")
          .eq("project_id", projectId)
          .eq("is_group", false)
          .order("sort_order", { ascending: true })
          .order("code", { ascending: true }),
        supabase
          .from("weekly_reports")
          .select("*")
          .eq("project_id", projectId),
        loadRecoveryForecast(projectId),
      ]);

      if (activitiesError) throw new Error(activitiesError.message);
      if (reportsError) throw new Error(reportsError.message);

      const actualReportIds = (weeklyReports || []).filter(isActualReport).map((report) => report.id);

      let weeklyEntries = [];

      if (actualReportIds.length) {
        const { data: entriesData, error: entriesError } = await supabase
          .from("weekly_entries")
          .select("*")
          .in("weekly_report_id", actualReportIds);

        if (entriesError) throw new Error(entriesError.message);
        weeklyEntries = entriesData || [];
      }

      const actualQtyMap = buildActualQtyMap(weeklyEntries);

      setRows(mergeRows(activities || [], forecasts, actualQtyMap));
      setDirtyIds(new Set());
    } catch (err) {
      window.alert(err.message || "Errore caricamento Recovery Forecast");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  function updateRow(activityId, field, value) {
    setRows((current) =>
      current.map((row) => (row.activityId === activityId ? { ...row, [field]: value } : row))
    );
    setDirtyIds((current) => new Set([...current, activityId]));
  }

  function copyBaselineDates(activityId) {
    setRows((current) =>
      current.map((row) =>
        row.activityId === activityId
          ? {
              ...row,
              forecastStart: row.plannedStart,
              forecastFinish: row.plannedFinish,
            }
          : row
      )
    );
    setDirtyIds((current) => new Set([...current, activityId]));
  }

  async function handleSave() {
    const dirtyRows = rows.filter((row) => dirtyIds.has(row.activityId));

    if (!dirtyRows.length) return;

    setSaving(true);

    try {
      await saveRecoveryForecast(projectId, dirtyRows);
      await loadPage();
    } catch (err) {
      window.alert(err.message || "Errore salvataggio Recovery Forecast");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="forecast-page">
        <section className="forecast-empty">Loading Recovery Forecast...</section>
      </main>
    );
  }

  return (
    <main className="forecast-page">
      <header className="forecast-hero">
        <div>
          <span>Recovery Forecast</span>
          <h1>EPC Recovery Plan</h1>
          <p>
            Pianifica il recupero sul residuo reale: Baseline Qty meno Actual Qty da Weekly.
            La baseline WBS non viene modificata.
          </p>
        </div>

        <button type="button" onClick={handleSave} disabled={dirtyIds.size === 0 || saving}>
          {saving ? "Saving..." : `Save Forecast (${dirtyIds.size})`}
        </button>
      </header>

      <section className="forecast-kpis">
        <article>
          <span>Activities</span>
          <strong>{metrics.totalActivities}</strong>
          <small>WBS operational rows</small>
        </article>
        <article>
          <span>Actual Qty</span>
          <strong>{metrics.totalActualQty}</strong>
          <small>From approved Weekly</small>
        </article>
        <article>
          <span>Remaining Qty</span>
          <strong>{metrics.totalRemainingQty}</strong>
          <small>Baseline {metrics.totalBaselineQty}</small>
        </article>
        <article>
          <span>Forecasted Weight</span>
          <strong>{metrics.forecastedWeight}%</strong>
          <small>Total WBS weight {metrics.totalWeight}%</small>
        </article>
        <article>
          <span>Forecast Finish</span>
          <strong>{metrics.forecastFinish}</strong>
          <small>Baseline finish {metrics.baselineFinish}</small>
        </article>
      </section>

      <section className="forecast-table-shell">
        <table className="forecast-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Activity</th>
              <th>Unit</th>
              <th>Baseline Qty</th>
              <th>Actual Qty</th>
              <th>Remaining Qty</th>
              <th>Weight</th>
              <th>Baseline Start</th>
              <th>Baseline Finish</th>
              <th>Forecast Start</th>
              <th>Forecast Finish</th>
              <th>Remaining Days</th>
              <th>Delta</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const delta = daysBetween(row.plannedFinish, row.forecastFinish);
              const days = remainingDays(row.forecastFinish);

              return (
                <tr key={row.activityId} className={dirtyIds.has(row.activityId) ? "forecast-dirty" : ""}>
                  <td>{row.code}</td>
                  <td className="forecast-activity">{row.name}</td>
                  <td>{row.unit || "—"}</td>
                  <td>{row.baselineQuantity}</td>
                  <td>{row.actualQuantity}</td>
                  <td className={row.remainingQuantity > 0 ? "remaining-open" : "remaining-complete"}>
                    {row.remainingQuantity}
                  </td>
                  <td>{row.weightPercent}%</td>
                  <td>{row.plannedStart || "—"}</td>
                  <td>{row.plannedFinish || "—"}</td>
                  <td>
                    <input
                      type="date"
                      value={row.forecastStart}
                      onChange={(event) => updateRow(row.activityId, "forecastStart", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={row.forecastFinish}
                      onChange={(event) => updateRow(row.activityId, "forecastFinish", event.target.value)}
                    />
                  </td>
                  <td>{row.forecastFinish ? `${days}d` : "—"}</td>
                  <td className={delta > 0 ? "delta-delay" : delta < 0 ? "delta-recovery" : ""}>
                    {row.forecastFinish ? `${delta > 0 ? "+" : ""}${delta}d` : "—"}
                  </td>
                  <td>
                    <input
                      value={row.forecastNote}
                      onChange={(event) => updateRow(row.activityId, "forecastNote", event.target.value)}
                      placeholder="Recovery note..."
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => copyBaselineDates(row.activityId)}>
                      Copy baseline
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
