import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  exportWeeklyExcel,
  importWeeklyExcel,
} from "../../features/weekly/excel/weeklyExcelService";
import {
  isWeeklyProductionLocked,
  loadProjectWeeklyProduction,
  removeProjectWeekly,
  saveProjectWeeklyProduction,
  toWeeklyNumber,
  unlockProjectWeekly,
} from "../../features/weekly/services/projectWeeklyService";
import "../../styles/construction-workspace.css";

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function mondayOf(value = new Date()) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function weekFromMonday(mondayIso) {
  const monday = mondayOf(`${mondayIso}T12:00:00`);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    weekStart: iso(monday),
    weekEnd: iso(friday),
  };
}

function shiftMonday(mondayIso, weeks) {
  const date = mondayOf(`${mondayIso}T12:00:00`);
  date.setDate(date.getDate() + weeks * 7);
  return iso(date);
}

function toNumber(value) {
  return toWeeklyNumber(value);
}

function percent(actual, baseline) {
  if (toNumber(baseline) <= 0) return 0;
  return Math.min((toNumber(actual) / toNumber(baseline)) * 100, 100);
}

export default function ProjectWeekly() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;

  const [weekStart, setWeekStart] = useState(() => iso(mondayOf()));
  const week = useMemo(() => weekFromMonday(weekStart), [weekStart]);

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");
  const [reports, setReports] = useState([]);
  const [report, setReport] = useState(null);
  const [activities, setActivities] = useState([]);
  const [weeklyValues, setWeeklyValues] = useState({});
  const [cumulativeValues, setCumulativeValues] = useState({});
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const weeklyExcelInputRef = useRef(null);

  const locked = isWeeklyProductionLocked(report?.status);

  const operationalActivities = useMemo(
    () => activities.filter((activity) => activity.is_group !== true),
    [activities]
  );

  const disciplines = useMemo(
    () => [...new Set(operationalActivities.map((activity) => activity.discipline).filter(Boolean))],
    [operationalActivities]
  );

  const visibleActivities = useMemo(() => {
    const term = search.toLowerCase();

    return operationalActivities.filter((activity) => {
      const matchSearch =
        !search ||
        String(activity.code || "").toLowerCase().includes(term) ||
        String(activity.name || "").toLowerCase().includes(term);

      const matchDiscipline = discipline === "all" || activity.discipline === discipline;
      return matchSearch && matchDiscipline;
    });
  }, [discipline, operationalActivities, search]);

  const weeklyTotal = useMemo(
    () => Object.values(weeklyValues).reduce((sum, value) => sum + toNumber(value), 0),
    [weeklyValues]
  );

  const activeRows = useMemo(
    () => Object.values(weeklyValues).filter((value) => toNumber(value) !== 0).length,
    [weeklyValues]
  );

  const loadWeekly = useCallback(async () => {
    setLoading(true);

    try {
      const data = await loadProjectWeeklyProduction({
        requestedProjectId: projectId,
        routeProjectId,
        weekStart: week.weekStart,
      });

      setProjects(data.projects);

      if (data.projectId !== projectId) {
        setProjectId(data.projectId);
      }

      setReports(data.reports);
      setReport(data.report);
      setActivities(data.activities);
      setWeeklyValues(data.weeklyValues);
      setCumulativeValues(data.cumulativeValues);
    } catch (error) {
      window.alert(error.message || "Errore caricamento Weekly");
      setReports([]);
      setReport(null);
      setActivities([]);
      setWeeklyValues({});
      setCumulativeValues({});
    } finally {
      setLoading(false);
    }
  }, [projectId, routeProjectId, week.weekStart]);

  useEffect(() => {
    loadWeekly();
  }, [loadWeekly]);

  async function saveWeekly(nextStatus = "DRAFT") {
    if (locked) {
      alert("Questa Weekly è già stata inviata o approvata e non è modificabile.");
      return;
    }

    setSaving(true);

    try {
      await saveProjectWeeklyProduction({
        projectId,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        status: nextStatus,
        weeklyValues,
      });

      await loadWeekly();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function unlockWeekly() {
    if (!report?.id) return;

    const confirmed = window.confirm(
      "Admin override: vuoi riaprire questa Weekly e riportarla in DRAFT?"
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await unlockProjectWeekly(report.id);
      await loadWeekly();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentWeekly() {
    if (!report?.id) {
      alert("Nessuna Weekly da eliminare per questa settimana.");
      return;
    }

    const confirmed = window.confirm(
      `Eliminare definitivamente la Weekly ${week.weekStart} / ${week.weekEnd}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await removeProjectWeekly(report.id);

      setReport(null);
      setWeeklyValues({});
      setCumulativeValues({});

      await loadWeekly();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitWeekly() {
    if (weeklyTotal <= 0) {
      alert("Inserisci almeno una quantità prima del submit.");
      return;
    }

    if (
      !window.confirm(
        "Confermi il submit della Weekly? Dopo il submit non sarà più modificabile dall'EPC."
      )
    ) {
      return;
    }

    await saveWeekly("SUBMITTED");
  }

  async function handleExportWeeklyExcel() {
    const selectedProject = projects.find(
      (project) => project.id === projectId
    );

    try {
      await exportWeeklyExcel({
        project: selectedProject,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        activities: operationalActivities,
        cumulativeValues,
        weeklyValues,
      });
    } catch (error) {
      window.alert(
        error.message || "Errore durante l'export Weekly Excel."
      );
    }
  }

  async function handleImportWeeklyExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (locked) {
      window.alert(
        "La Weekly è bloccata. Esegui Admin Unlock prima di importare."
      );
      return;
    }

    setImportingExcel(true);

    try {
      const result = await importWeeklyExcel(
        file,
        operationalActivities
      );

      setWeeklyValues((current) => ({
        ...current,
        ...result.values,
      }));

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
          `Import completato: ${result.importedRows} attività aggiornate.`,
          "I valori sono in bozza: premi Save Draft per salvarli.",
          ...warnings,
        ].join("\n")
      );
    } catch (error) {
      window.alert(
        error.message || "Errore durante l'import Weekly Excel."
      );
    } finally {
      setImportingExcel(false);
    }
  }

  return (
    <main className="construction-workspace">
      <header className="weekly-enterprise-header">
        <div className="weekly-enterprise-title">
          <span>EPC Production Area</span>
          <h1>Weekly Production</h1>
          <p>
            Inserisci esclusivamente le quantità prodotte. Baseline e pesi
            rimangono in sola lettura.
          </p>
        </div>

        <label className="weekly-project-select">
          <span>Project</span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="weekly-period-panel">
        <button
          type="button"
          onClick={() =>
            setWeekStart((current) => shiftMonday(current, -1))
          }
        >
          ← Previous Week
        </button>

        <div className="weekly-period-copy">
          <span>Reporting Week</span>
          <strong>
            {week.weekStart} — {week.weekEnd}
          </strong>
          <small
            className={`weekly-status weekly-status-${String(
              report?.status || "DRAFT"
            ).toLowerCase()}`}
          >
            {report?.status || "DRAFT"}
          </small>
        </div>

        <button
          type="button"
          onClick={() =>
            setWeekStart((current) => shiftMonday(current, 1))
          }
        >
          Next Week →
        </button>
      </section>

      <section className="weekly-summary-strip">
        <article>
          <span>Status</span>
          <strong>{report?.status || "DRAFT"}</strong>
        </article>

        <article>
          <span>Activities</span>
          <strong>{operationalActivities.length}</strong>
        </article>

        <article>
          <span>Rows Updated</span>
          <strong>{activeRows}</strong>
        </article>

        <article>
          <span>Weekly Qty</span>
          <strong>{weeklyTotal}</strong>
        </article>

        <article>
          <span>Historical Reports</span>
          <strong>{reports.length}</strong>
        </article>
      </section>

      <section className="weekly-command-bar">
        <div>
          <span
            className={
              locked
                ? "weekly-edit-state weekly-edit-state-locked"
                : "weekly-edit-state weekly-edit-state-open"
            }
          >
            <i />
            {locked ? "Weekly locked" : "Weekly editable"}
          </span>

          <small>
            {locked
              ? "La Weekly è stata inviata e alimenta la Control Room."
              : "Importa o inserisci le quantità, poi salva la bozza o esegui il submit."}
          </small>
        </div>

        <div className="weekly-command-actions">
          <button
            type="button"
            className="weekly-save-button"
            onClick={() => saveWeekly("DRAFT")}
            disabled={saving || locked}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            className="weekly-submit-button"
            onClick={submitWeekly}
            disabled={saving || locked}
          >
            Submit Weekly
          </button>

          {locked ? (
            <button
              type="button"
              className="weekly-danger-button"
              onClick={unlockWeekly}
              disabled={saving}
            >
              Admin Unlock
            </button>
          ) : null}

          {report?.id ? (
            <button
              type="button"
              className="weekly-danger-button"
              onClick={deleteCurrentWeekly}
              disabled={saving}
            >
              Delete Weekly
            </button>
          ) : null}
        </div>
      </section>

      <section className="weekly-filter-toolbar">
        <div className="weekly-filter-fields">
          <label>
            <span>Search</span>
            <input
              placeholder="Code or activity..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label>
            <span>Discipline</span>
            <select
              value={discipline}
              onChange={(event) => setDiscipline(event.target.value)}
            >
              <option value="all">All disciplines</option>
              {disciplines.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="weekly-excel-actions">
          <input
            ref={weeklyExcelInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleImportWeeklyExcel}
          />

          <button
            type="button"
            onClick={() => weeklyExcelInputRef.current?.click()}
            disabled={locked || importingExcel}
          >
            {importingExcel ? "Reading Excel..." : "Import Excel"}
          </button>

          <button
            type="button"
            onClick={handleExportWeeklyExcel}
            disabled={!operationalActivities.length}
          >
            Export Excel
          </button>
        </div>
      </section>

      <section className="cw-grid-shell">
        {loading ? (
          <div className="cw-empty">Loading Weekly...</div>
        ) : (
          <table className="cw-grid cw-weekly-grid">
            <thead>
              <tr>
                <th>Code</th>
                <th>Activity</th>
                <th>Discipline</th>
                <th>U.M.</th>
                <th>Baseline</th>
                <th>Previous Cumulative</th>
                <th>This Week</th>
                <th>Projected Progress</th>
              </tr>
            </thead>

            <tbody>
              {visibleActivities.map((activity) => {
                const cumulative = toNumber(cumulativeValues[activity.id]);
                const weeklyQty = toNumber(weeklyValues[activity.id]);
                const progress = percent(cumulative + weeklyQty, activity.baseline_quantity);

                return (
                  <tr key={activity.id}>
                    <td>{activity.code}</td>
                    <td className="cw-activity-readonly">{activity.name}</td>
                    <td>{activity.discipline}</td>
                    <td>{activity.unit}</td>
                    <td>{activity.baseline_quantity}</td>
                    <td>{cumulative}</td>
                    <td>
                      <input
                        className="cw-weekly-input"
                        type="number"
                        min="0"
                        disabled={locked}
                        value={weeklyValues[activity.id] ?? ""}
                        onChange={(event) =>
                          setWeeklyValues((current) => ({
                            ...current,
                            [activity.id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="cw-progress-cell">
                      <span>{progress.toFixed(1)}%</span>
                      <div><i style={{ width: `${progress}%` }} /></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
