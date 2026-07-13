import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  activateRecoveryRevision,
  archiveRecoveryPlan,
  createRecoveryRevision,
  deleteRecoveryPlan,
  deleteRecoveryRevision,
  loadRecoveryForecastSourceData,
  loadRecoveryItems,
  loadRecoveryRevisions,
  saveRecoveryItems,
  updateRecoveryRevision,
} from "../../features/forecast/services/recoveryForecastService";
import {
  exportRecoveryExcel,
  importRecoveryExcel,
} from "../../features/forecast/excel/recoveryExcelService";
import "../../styles/forecast.css";
import {
  buildActualQtyMap,
  buildRecentWeeklyQtyMap,
  daysBetween,
  isActualReport,
  mergeRows,
  productivityGap,
  productivityRisk,
  remainingDays,
  toNumber,
} from "../../features/forecast/domain/recoveryForecastModel";

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
  const [importingExcel, setImportingExcel] = useState(false);
  const recoveryExcelInputRef = useRef(null);

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
        sourceData,
        forecastItems,
      ] = await Promise.all([
        loadRecoveryForecastSourceData(projectId),
        loadRecoveryItems(nextSelectedRevision.id),
      ]);

      const activities = sourceData.activities;
      const weeklyReports = sourceData.weeklyReports;

      const actualReportIds = weeklyReports
        .filter(isActualReport)
        .map((report) => report.id);

      const actualReportIdSet = new Set(actualReportIds);

      const weeklyEntries = sourceData.weeklyEntries.filter(
        (entry) =>
          actualReportIdSet.has(entry.weekly_report_id)
      );

      const actualQtyMap = buildActualQtyMap(weeklyEntries);
      const weeklyProductivityMap = buildRecentWeeklyQtyMap(weeklyReports || [], weeklyEntries, 4);

      setRevisions(nextRevisions);
      setSelectedRevisionId(nextSelectedRevision.id);
      setSelectedRevision(nextSelectedRevision);
      setRows(mergeRows(activities, forecastItems, actualQtyMap, weeklyProductivityMap));
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

  async function handleExportRecoveryExcel() {
    try {
      await exportRecoveryExcel({
        projectId,
        revision: selectedRevision,
        rows,
      });
    } catch (error) {
      window.alert(
        error.message || "Errore durante l'export Recovery Excel."
      );
    }
  }

  async function handleImportRecoveryExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setImportingExcel(true);

    try {
      const result = await importRecoveryExcel(file, rows);

      setRows((current) =>
        current.map((row) => {
          const update = result.updates[row.activityId];

          return update
            ? {
                ...row,
                ...update,
              }
            : row;
        })
      );

      setDirtyIds(
        (current) =>
          new Set([
            ...current,
            ...Object.keys(result.updates),
          ])
      );

      const warnings = [];

      if (result.unknownCodes.length) {
        warnings.push(
          `Codici non trovati: ${result.unknownCodes.join(", ")}`
        );
      }

      if (result.duplicateCodes.length) {
        warnings.push(
          `Codici duplicati ignorati: ${result.duplicateCodes.join(", ")}`
        );
      }

      window.alert(
        [
          `Import completato: ${result.updatedRows} attività aggiornate.`,
          "Le modifiche sono in bozza: premi Save per salvarle.",
          ...warnings,
        ].join("\n")
      );
    } catch (error) {
      window.alert(
        error.message || "Errore durante l'import Recovery Excel."
      );
    } finally {
      setImportingExcel(false);
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
      <header className="forecast-enterprise-header">
        <div className="forecast-enterprise-title">
          <span>Recovery Forecast</span>
          <h1>EPC Recovery Plan</h1>
          <p>
            Pianifica il recupero sul residuo reale: Baseline Qty meno
            Actual Qty derivata dalle Weekly approvate.
          </p>
        </div>

        <div className="forecast-revision-panel">
          <label>
            <span>Revision</span>
            <select
              value={selectedRevisionId}
              onChange={(event) =>
                setSelectedRevisionId(event.target.value)
              }
            >
              {revisions.map((revision) => (
                <option key={revision.id} value={revision.id}>
                  Rev.{revision.revisionNumber} · {revision.status}
                </option>
              ))}
            </select>
          </label>

          <label className="forecast-revision-title">
            <span>Title</span>
            <input
              value={selectedRevision?.title || ""}
              onChange={(event) =>
                updateRevision("title", event.target.value)
              }
              placeholder="Revision title"
            />
          </label>

          <label>
            <span>Issue Date</span>
            <input
              type="date"
              value={selectedRevision?.issueDate || ""}
              onChange={(event) =>
                updateRevision("issueDate", event.target.value)
              }
            />
          </label>
        </div>
      </header>

      <section className="forecast-command-bar">
        <div className="forecast-status-copy">
          <span
            className={
              isActive
                ? "forecast-status forecast-status-active"
                : "forecast-status forecast-status-draft"
            }
          >
            <i />
            {isActive
              ? `Rev.${selectedRevision.revisionNumber} active`
              : `Rev.${selectedRevision.revisionNumber} draft`}
          </span>

          <small>
            {canSave
              ? `${dirtyIds.size} activity change${
                  dirtyIds.size === 1 ? "" : "s"
                } pending`
              : "All Recovery changes saved"}
          </small>
        </div>

        <div className="forecast-primary-actions">
          <button type="button" onClick={handleCreateRevision}>
            + New Revision
          </button>

          <button
            type="button"
            onClick={handleActivateRevision}
            disabled={isActive}
          >
            {isActive ? "Active" : "Set Active"}
          </button>

          <input
            ref={recoveryExcelInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleImportRecoveryExcel}
          />

          <button
            type="button"
            className="forecast-secondary-button"
            disabled={importingExcel}
            onClick={() => recoveryExcelInputRef.current?.click()}
          >
            {importingExcel ? "Reading Excel..." : "Import Excel"}
          </button>

          <button
            type="button"
            className="forecast-secondary-button"
            onClick={handleExportRecoveryExcel}
            disabled={!rows.length}
          >
            Export Excel
          </button>

          <button
            type="button"
            className="forecast-save-button"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving
              ? "Saving..."
              : `Save${dirtyIds.size ? ` (${dirtyIds.size})` : ""}`}
          </button>
        </div>

        <div className="forecast-danger-actions">
          <button
            type="button"
            onClick={handleDeleteRevision}
            disabled={revisions.length <= 1}
          >
            Delete Revision
          </button>

          <button
            type="button"
            onClick={handleArchiveRecoveryPlan}
          >
            Archive Plan
          </button>

          <button
            type="button"
            className="forecast-delete-plan"
            onClick={handleDeleteRecoveryPlan}
          >
            Delete Plan
          </button>
        </div>
      </section>

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
