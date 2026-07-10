import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  activateRecoveryRevision,
  archiveRecoveryPlan,
  createAndActivateRecoveryPlan,
  createRecoveryRevision,
  deleteRecoveryPlan,
  deleteRecoveryRevision,
  loadRecoveryItems,
  loadRecoveryRevisions,
  saveRecoveryItems,
  updateRecoveryRevision,
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

function buildRecentWeeklyQtyMap(reports, entries, weeksCount = 4) {
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

function productivityGap(requiredWeekly, currentWeekly) {
  const required = toNumber(requiredWeekly);
  const current = toNumber(currentWeekly);
  if (required <= 0) return 0;
  return Number((((required - current) / required) * 100).toFixed(1));
}

function productivityRisk(requiredWeekly, currentWeekly) {
  const required = toNumber(requiredWeekly);
  const current = toNumber(currentWeekly);

  if (required <= 0) return "OK";
  if (current >= required) return "OK";

  const gap = ((required - current) / required) * 100;
  if (gap <= 10) return "LOW";
  if (gap <= 25) return "MEDIUM";
  return "HIGH";
}

function mergeRows(activities, forecastItems, actualQtyMap, weeklyProductivityMap = {}) {
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

export default function ProjectForecast() {
  const params = useParams();
  const projectId = params.projectId || params.id || "";

  const [revisions, setRevisions] = useState([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState("");
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [revisionDirty, setRevisionDirty] = useState(false);
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
  }, [rows]);

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      let nextRevisions = (await loadRecoveryRevisions(projectId)).filter(
        (revision) => revision.status !== "ARCHIVED"
      );

      if (!nextRevisions.length) {
        setRevisions([]);
        setSelectedRevisionId("");
        setSelectedRevision(null);
        setRows([]);
        setDirtyIds(new Set());
        setRevisionDirty(false);
        return;
      }

      const nextSelectedRevision =
        nextRevisions.find((revision) => revision.id === selectedRevisionId) ||
        nextRevisions.find((revision) => revision.status === "ACTIVE") ||
        nextRevisions[0];

      const [
        { data: activities, error: activitiesError },
        { data: weeklyReports, error: reportsError },
        forecastItems,
      ] = await Promise.all([
        supabase
          .from("wbs_activities")
          .select("*")
          .eq("project_id", projectId)
          .eq("is_group", false)
          .order("sort_order", { ascending: true })
          .order("code", { ascending: true }),
        supabase.from("weekly_reports").select("*").eq("project_id", projectId),
        loadRecoveryItems(nextSelectedRevision.id),
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
      const weeklyProductivityMap = buildRecentWeeklyQtyMap(weeklyReports || [], weeklyEntries, 4);

      setRevisions(nextRevisions);
      setSelectedRevisionId(nextSelectedRevision.id);
      setSelectedRevision(nextSelectedRevision);
      setRows(mergeRows(activities || [], forecastItems, actualQtyMap, weeklyProductivityMap));
      setDirtyIds(new Set());
      setRevisionDirty(false);
    } catch (err) {
      window.alert(err.message || "Errore caricamento Recovery Forecast");
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedRevisionId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  function updateRow(activityId, field, value) {
    setRows((current) =>
      current.map((row) => (row.activityId === activityId ? { ...row, [field]: value } : row))
    );
    setDirtyIds((current) => new Set([...current, activityId]));
  }

  function updateRevision(field, value) {
    setSelectedRevision((current) => ({ ...current, [field]: value }));
    setRevisionDirty(true);
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

  function buildRevisionSnapshot() {
    const totalWeight = rows.reduce((sum, row) => sum + toNumber(row.weightPercent), 0);

    const actualWeighted = rows.reduce((sum, row) => {
      const baseline = toNumber(row.baselineQuantity);
      const actual = toNumber(row.actualQuantity);
      const weight = toNumber(row.weightPercent);
      const progress = baseline > 0 ? Math.min((actual / baseline) * 100, 100) : 0;
      return sum + (progress / 100) * weight;
    }, 0);

    const today = new Date();

    const plannedWeighted = rows.reduce((sum, row) => {
      const start = row.plannedStart ? new Date(`${row.plannedStart}T12:00:00`) : null;
      const finish = row.plannedFinish ? new Date(`${row.plannedFinish}T12:00:00`) : null;
      const weight = toNumber(row.weightPercent);

      if (!start || !finish || Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) return sum;

      let progress = 0;

      if (today >= finish) progress = 100;
      else if (today > start) {
        const totalMs = finish.getTime() - start.getTime();
        const elapsedMs = today.getTime() - start.getTime();
        progress = totalMs > 0 ? Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100) : 100;
      }

      return sum + (progress / 100) * weight;
    }, 0);

    return {
      actualProgressSnapshot: totalWeight > 0 ? Number(((actualWeighted / totalWeight) * 100).toFixed(1)) : 0,
      plannedProgressSnapshot: totalWeight > 0 ? Number(((plannedWeighted / totalWeight) * 100).toFixed(1)) : 0,
      actualQtySnapshot: Number(rows.reduce((sum, row) => sum + toNumber(row.actualQuantity), 0).toFixed(2)),
      remainingQtySnapshot: Number(rows.reduce((sum, row) => sum + toNumber(row.remainingQuantity), 0).toFixed(2)),
      forecastFinishSnapshot:
        rows.map((row) => row.forecastFinish || row.plannedFinish).filter(Boolean).sort().at(-1) || "",
    };
  }

  async function handleSave() {
    if (!selectedRevision) return;

    setSaving(true);

    try {
      const dirtyRows = rows.filter((row) => dirtyIds.has(row.activityId));
      const revisionWithSnapshot = {
        ...selectedRevision,
        ...buildRevisionSnapshot(),
      };

      const updatedRevision = await updateRecoveryRevision(revisionWithSnapshot);

      if (dirtyRows.length) {
        await saveRecoveryItems(updatedRevision, dirtyRows);
      }

      await loadPage();
    } catch (err) {
      window.alert(err.message || "Errore salvataggio Recovery Forecast");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRevision() {
    try {
      const created = await createRecoveryRevision(projectId);

      if (selectedRevision && rows.length) {
        await saveRecoveryItems(created, rows);
      }

      setSelectedRevisionId(created.id);
      await loadPage();
      await loadPage();
    } catch (err) {
      window.alert(err.message || "Errore creazione Recovery Revision");
    }
  }

  async function handleArchiveRecoveryPlan() {
    const confirmed = window.confirm(
      "Archiviare il Recovery Plan? La tab Recovery verrà nascosta, ma lo storico resterà nel database."
    );

    if (!confirmed) return;

    try {
      await archiveRecoveryPlan(projectId);
      setSelectedRevisionId("");
      await loadPage();
    } catch (err) {
      window.alert(err.message || "Errore archiviazione Recovery Plan");
    }
  }

  async function handleDeleteRecoveryPlan() {
    const confirmed = window.confirm(
      "ATTENZIONE: eliminare definitivamente tutto il Recovery Plan del progetto?"
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      "Conferma definitiva: verranno eliminate tutte le revisioni Recovery e le relative date forecast."
    );

    if (!secondConfirm) return;

    try {
      await deleteRecoveryPlan(projectId);
      setSelectedRevisionId("");
      await loadPage();
    } catch (err) {
      window.alert(err.message || "Errore eliminazione Recovery Plan");
    }
  }

  async function handleDeleteRevision() {
    if (!selectedRevision) return;

    if (revisions.length <= 1) {
      window.alert("Non puoi eliminare l'unica Recovery Revision del progetto.");
      return;
    }

    const confirmed = window.confirm(
      `Eliminare definitivamente Rev.${selectedRevision.revisionNumber} · ${selectedRevision.title}?`
    );

    if (!confirmed) return;

    try {
      await deleteRecoveryRevision(selectedRevision.id);
      const remaining = revisions.filter((revision) => revision.id !== selectedRevision.id);
      setSelectedRevisionId(remaining[0]?.id || "");
      await loadPage();
    } catch (err) {
      window.alert(err.message || "Errore eliminazione Recovery Revision");
    }
  }

  async function handleActivateRevision() {
    if (!selectedRevision) return;

    try {
      await activateRecoveryRevision(projectId, selectedRevision.id);
      await loadPage();
    } catch (err) {
      window.alert(err.message || "Errore attivazione Recovery Revision");
    }
  }

  if (loading) {
    return (
      <main className="forecast-page">
        <section className="forecast-empty">Loading Recovery Forecast...</section>
      </main>
    );
  }

  if (!selectedRevision) {
    return (
      <main className="forecast-page">
        <section className="forecast-hero forecast-empty-state">
          <div>
            <span>Recovery Forecast</span>
            <h1>No Recovery Plan</h1>
            <p>
              Il Recovery Plan è opzionale. Crealo solo quando il progetto è in ritardo
              e vuoi richiedere all'EPC un piano di recupero separato dalla baseline WBS.
            </p>
          </div>

          <button type="button" onClick={handleCreateRevision}>
            Create Recovery Plan
          </button>
        </section>
      </main>
    );
  }

  const canSave = dirtyIds.size > 0 || revisionDirty;
  const isActive = selectedRevision?.status === "ACTIVE";

  if (!selectedRevision) {
    return (
      <main className="forecast-page">
        <section className="forecast-hero forecast-empty-state">
          <div>
            <span>Recovery Forecast</span>
            <h1>No Recovery Plan</h1>
            <p>
              Il Recovery Plan è opzionale. Crealo solo quando il progetto è in ritardo
              e vuoi richiedere all'EPC un piano di recupero separato dalla baseline WBS.
            </p>
          </div>

          <button type="button" onClick={handleCreateRevision}>
            Create Recovery Plan
          </button>
        </section>
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

        <div className="forecast-actions">
          <select value={selectedRevisionId} onChange={(event) => setSelectedRevisionId(event.target.value)}>
            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                Rev.{revision.revisionNumber} · {revision.status}
              </option>
            ))}
          </select>

          <input
            value={selectedRevision?.title || ""}
            onChange={(event) => updateRevision("title", event.target.value)}
            placeholder="Revision title"
          />

          <input
            type="date"
            value={selectedRevision?.issueDate || ""}
            onChange={(event) => updateRevision("issueDate", event.target.value)}
          />

          <button type="button" onClick={handleCreateRevision}>
            + New Rev
          </button>

          <button type="button" onClick={handleActivateRevision} disabled={isActive}>
            {isActive ? "Active" : "Set Active"}
          </button>

          <button type="button" className="forecast-danger" onClick={handleDeleteRevision} disabled={revisions.length <= 1}>
            Delete Rev
          </button>

          <button type="button" className="forecast-danger" onClick={handleArchiveRecoveryPlan}>
            Archive Plan
          </button>

          <button type="button" className="forecast-danger" onClick={handleDeleteRecoveryPlan}>
            Delete Plan
          </button>

          <button type="button" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Saving..." : `Save (${dirtyIds.size})`}
          </button>
        </div>
      </header>

      <section className="forecast-note-panel">
        <label>
          Revision Note
          <textarea
            value={selectedRevision?.generalNote || ""}
            onChange={(event) => updateRevision("generalNote", event.target.value)}
            placeholder="General recovery strategy, assumptions, constraints..."
          />
        </label>
      </section>

      <section className="forecast-kpis clean-kpis">
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
        <article>
          <span>Recovery Risk</span>
          <strong>{metrics.highRiskActivities}</strong>
          <small>High risk activities</small>
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
              <th>Remaining Weeks</th>
              <th>Req./Week</th>
              <th>Current/Week</th>
              <th>Gap</th>
              <th>Risk</th>
              <th>Delta</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const delta = daysBetween(row.plannedFinish, row.forecastFinish);
              const days = remainingDays(row.forecastFinish);
              const weeks = row.forecastFinish ? Math.max(1, Math.ceil(days / 7)) : 0;
              const requiredWeekly = weeks > 0 ? Number((row.remainingQuantity / weeks).toFixed(2)) : 0;
              const currentWeekly = Number(toNumber(row.currentWeeklyProductivity).toFixed(2));
              const gap = productivityGap(requiredWeekly, currentWeekly);
              const risk = productivityRisk(requiredWeekly, currentWeekly);

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
                  <td>{row.forecastFinish ? `${weeks}w` : "—"}</td>
                  <td>{row.forecastFinish ? requiredWeekly : "—"}</td>
                  <td>{currentWeekly}</td>
                  <td className={gap > 25 ? "delta-delay" : gap > 10 ? "delta-warning" : "delta-recovery"}>
                    {row.forecastFinish ? `${gap > 0 ? "+" : ""}${gap}%` : "—"}
                  </td>
                  <td className={`recovery-risk-${risk}`}>{risk}</td>
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
