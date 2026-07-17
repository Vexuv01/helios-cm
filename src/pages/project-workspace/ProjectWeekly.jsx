import {
  calculateWeeklyProgress,
  shiftMonday,
  toWeeklyDisplayNumber,
  useProjectWeeklyPage,
} from "../../features/weekly/hooks/useProjectWeeklyPage";
import "../../styles/construction-workspace.css";

export default function ProjectWeekly() {
  const {
    setWeekStart,
    week,
    projects,
    projectId,
    setProjectId,
    reports,
    report,
    weeklyValues,
    setWeeklyValues,
    cumulativeValues,
    search,
    setSearch,
    discipline,
    setDiscipline,
    loading,
    saving,
    importingExcel,
    weeklyExcelInputRef,
    locked,
    operationalActivities,
    disciplines,
    visibleActivities,
    weeklyTotal,
    activeRows,
    saveWeekly,
    submitWeekly,
    unlockWeekly,
    deleteCurrentWeekly,
    handleExportWeeklyExcel,
    handleImportWeeklyExcel,
  } = useProjectWeeklyPage();

  function toNumber(value) {
    return toWeeklyDisplayNumber(value);
  }

  function percent(actual, baseline) {
    return calculateWeeklyProgress(actual, baseline);
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
