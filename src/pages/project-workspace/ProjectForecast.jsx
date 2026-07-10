import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  loadRecoveryForecast,
  saveRecoveryForecast,
} from "../../features/forecast/services/recoveryForecastService";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/forecast.css";

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

function daysBetween(start, finish) {
  if (!start || !finish) return 0;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${finish}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function mergeRows(activities, forecasts) {
  const forecastByActivity = new Map(forecasts.map((item) => [item.activityId, item]));

  return activities.map((activity) => {
    const forecast = forecastByActivity.get(activity.id);

    return {
      activityId: activity.id,
      code: activity.code || "",
      name: activity.name || "",
      discipline: activity.discipline || "GENERAL",
      unit: activity.unit || "",
      baselineQuantity: toNumber(activity.baseline_quantity),
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
      baselineFinish: baselineFinish || "—",
      forecastFinish: forecastFinish || "—",
    };
  }, [rows]);

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const [{ data: activities, error }, forecasts] = await Promise.all([
        supabase
          .from("wbs_activities")
          .select("*")
          .eq("project_id", projectId)
          .eq("is_group", false)
          .order("sort_order", { ascending: true })
          .order("code", { ascending: true }),
        loadRecoveryForecast(projectId),
      ]);

      if (error) throw new Error(error.message);

      setRows(mergeRows(activities || [], forecasts));
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
            Modifica le date forecast senza alterare la baseline WBS originale. La Dashboard
            userà queste date per generare la terza S-Curve.
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
          <span>Forecasted</span>
          <strong>{metrics.forecasted}</strong>
          <small>Rows with forecast dates</small>
        </article>
        <article>
          <span>Forecasted Weight</span>
          <strong>{metrics.forecastedWeight}%</strong>
          <small>Total WBS weight {metrics.totalWeight}%</small>
        </article>
        <article>
          <span>Baseline Finish</span>
          <strong>{metrics.baselineFinish}</strong>
          <small>From original WBS</small>
        </article>
        <article>
          <span>Forecast Finish</span>
          <strong>{metrics.forecastFinish}</strong>
          <small>From recovery plan</small>
        </article>
      </section>

      <section className="forecast-table-shell">
        <table className="forecast-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Activity</th>
              <th>Discipline</th>
              <th>Weight</th>
              <th>Baseline Start</th>
              <th>Baseline Finish</th>
              <th>Forecast Start</th>
              <th>Forecast Finish</th>
              <th>Delta</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const delta = daysBetween(row.plannedFinish, row.forecastFinish);

              return (
                <tr key={row.activityId} className={dirtyIds.has(row.activityId) ? "forecast-dirty" : ""}>
                  <td>{row.code}</td>
                  <td className="forecast-activity">{row.name}</td>
                  <td>{row.discipline}</td>
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
