import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import {
  EMPTY_WBS_ACTIVITY,
  importPvAgripvWbsTemplate,
  loadProjectWbs,
  removeWbsActivity,
  saveWbsActivity,
} from "../../features/wbs/services/wbsService";
import ActivityDrawer from "../../features/construction-activity/components/ActivityDrawer";
import "../../styles/wbs.css";

const STATUSES = ["DRAFT", "BASELINE", "IN_PROGRESS", "COMPLETED", "ON_HOLD"];

const DISCIPLINE_LABELS = {
  ENGINEERING: "Ingegneria",
  PROCUREMENT: "Procurement",
  CIVIL: "Opere Civili",
  MECHANICAL: "Opere Meccaniche",
  ELECTRICAL: "Opere Elettriche",
  COMMISSIONING: "Collaudi e Commissioning",
  GRID_CONNECTION: "Opere di Rete",
  GENERAL: "General",
};

function createEmptyRow(projectId, sortOrder) {
  return {
    ...EMPTY_WBS_ACTIVITY,
    projectId,
    code: `NEW-${String(sortOrder).padStart(3, "0")}`,
    name: "New activity",
    sortOrder,
  };
}

function numberValue(value) {
  return Number(value || 0);
}

function formatNumber(value, digits = 2) {
  return numberValue(value).toFixed(digits);
}

function calculateProgress(activity) {
  const baseline = numberValue(activity.baselineQuantity);
  const installed = numberValue(activity.installedQuantity);

  if (baseline <= 0) return 0;

  return Math.min((installed / baseline) * 100, 100);
}

export default function ProjectWbs() {
  const { currentProject, projectId } = useProject();

  const [wbs, setWbs] = useState({
    activities: [],
    totals: { baselineQuantity: 0, weightPercent: 0 },
    disciplines: [],
  });
  const [draftRows, setDraftRows] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [savingId, setSavingId] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const refreshWbs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await loadProjectWbs(projectId);
      setWbs(data);
      setDraftRows(data.activities);
      setExpanded((current) => {
        if (Object.keys(current).length > 0) return current;

        return data.activities.reduce((acc, activity) => {
          acc[activity.discipline || "GENERAL"] = true;
          return acc;
        }, {});
      });
    } catch (err) {
      setError(err.message || "Unable to load WBS");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refreshWbs();
  }, [refreshWbs]);

  const groupedRows = useMemo(() => {
    return draftRows.reduce((acc, activity) => {
      const key = activity.discipline || "GENERAL";

      if (!acc[key]) acc[key] = [];

      acc[key].push(activity);
      return acc;
    }, {});
  }, [draftRows]);

  const disciplineSummary = useMemo(() => {
    return Object.entries(groupedRows).map(([discipline, activities]) => {
      const weightPercent = activities.reduce(
        (sum, activity) => sum + numberValue(activity.weightPercent),
        0
      );
      const earnedWeight = activities.reduce((sum, activity) => {
        return sum + (calculateProgress(activity) / 100) * numberValue(activity.weightPercent);
      }, 0);

      return {
        discipline,
        label: DISCIPLINE_LABELS[discipline] || discipline,
        activities: activities.length,
        weightPercent,
        progress: weightPercent > 0 ? (earnedWeight / weightPercent) * 100 : 0,
      };
    });
  }, [groupedRows]);

  const totalWeight = draftRows.reduce(
    (sum, activity) => sum + numberValue(activity.weightPercent),
    0
  );

  function updateRow(rowId, field, value) {
    setDraftRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );

    setSelectedActivity((current) =>
      current?.id === rowId ? { ...current, [field]: value } : current
    );
  }

  function updateSelectedActivity(field, value) {
    if (!selectedActivity) return;
    updateRow(selectedActivity.id, field, value);
  }

  async function saveRow(row) {
    setSavingId(row.id || row.code);
    setError("");

    try {
      await saveWbsActivity(projectId, row);
      await refreshWbs();
    } catch (err) {
      setError(err.message || "Unable to save WBS activity");
    } finally {
      setSavingId("");
    }
  }

  async function addActivity(discipline = "GENERAL") {
    const row = createEmptyRow(projectId, draftRows.length + 1);

    row.discipline = discipline;

    setSavingId(row.code);
    setError("");

    try {
      await saveWbsActivity(projectId, row);
      await refreshWbs();
      setExpanded((current) => ({ ...current, [discipline]: true }));
    } catch (err) {
      setError(err.message || "Unable to add WBS activity");
    } finally {
      setSavingId("");
    }
  }

  async function deleteActivity(activity) {
    const confirmed = window.confirm(
      `Delete WBS activity ${activity.code} - ${activity.name}?`
    );

    if (!confirmed) return;

    setSavingId(activity.id);
    setError("");

    try {
      await removeWbsActivity(activity.id, projectId);
      if (selectedActivity?.id === activity.id) setSelectedActivity(null);
      await refreshWbs();
    } catch (err) {
      setError(err.message || "Unable to delete WBS activity");
    } finally {
      setSavingId("");
    }
  }

  async function importTemplate() {
    const confirmed = window.confirm(
      "Import the standard FV/AgriPV WBS template into this project?"
    );

    if (!confirmed) return;

    setImporting(true);
    setError("");

    try {
      await importPvAgripvWbsTemplate(projectId);
      await refreshWbs();
    } catch (err) {
      setError(err.message || "Unable to import WBS template");
    } finally {
      setImporting(false);
    }
  }

  function toggleDiscipline(discipline) {
    setExpanded((current) => ({
      ...current,
      [discipline]: !current[discipline],
    }));
  }

  if (loading) {
    return <p className="wbs-empty">Loading WBS baseline...</p>;
  }

  return (
    <div className="wbs-page">
      <header className="wbs-control-header">
        <div>
          <span className="wbs-eyebrow">HELIOS WBS Baseline</span>
          <h2>{currentProject?.name}</h2>
          <p>
            Real editable construction baseline. Quantities, weights and planned
            dates feed Weekly production, Snapshot, Forecast and Control Room.
          </p>
        </div>

        <div className="wbs-header-actions">
          <button type="button" onClick={importTemplate} disabled={importing || draftRows.length > 0}>
            {importing ? "Importing..." : "Import FV/AgriPV Template"}
          </button>
          <button type="button" className="wbs-secondary" onClick={() => addActivity("GENERAL")}>
            + Add Activity
          </button>
        </div>
      </header>

      {error ? <div className="wbs-error">{error}</div> : null}

      <section className="wbs-kpi-grid">
        <article>
          <span>Activities</span>
          <strong>{draftRows.length}</strong>
          <small>Editable WBS records</small>
        </article>
        <article>
          <span>Disciplines</span>
          <strong>{disciplineSummary.length}</strong>
          <small>Construction areas</small>
        </article>
        <article>
          <span>Total Weight</span>
          <strong>{formatNumber(totalWeight)}%</strong>
          <small>Target baseline = 100%</small>
        </article>
        <article>
          <span>Baseline Qty</span>
          <strong>{formatNumber(wbs.totals.baselineQuantity)}</strong>
          <small>Total planned quantities</small>
        </article>
      </section>

      <section className="wbs-discipline-strip">
        {disciplineSummary.map((item) => (
          <button
            key={item.discipline}
            type="button"
            onClick={() => toggleDiscipline(item.discipline)}
            className={expanded[item.discipline] ? "active" : ""}
          >
            <span>{item.label}</span>
            <strong>{formatNumber(item.progress, 1)}%</strong>
            <small>{formatNumber(item.weightPercent)}% weight · {item.activities} rows</small>
          </button>
        ))}
      </section>

      <section className="wbs-enterprise-table">
        <div className="wbs-table-toolbar">
          <div>
            <h3>Construction WBS</h3>
            <p>Edit directly inside the table. Save each row after changing quantities, dates or weights.</p>
          </div>
        </div>

        {draftRows.length === 0 ? (
          <div className="wbs-empty-state">
            <strong>No WBS activities yet.</strong>
            <p>Import the FV/AgriPV template or create the first activity manually.</p>
          </div>
        ) : (
          Object.entries(groupedRows).map(([discipline, activities]) => (
            <div key={discipline} className="wbs-group">
              <button
                type="button"
                className="wbs-group-header"
                onClick={() => toggleDiscipline(discipline)}
              >
                <span>{expanded[discipline] ? "▾" : "▸"}</span>
                <strong>{DISCIPLINE_LABELS[discipline] || discipline}</strong>
                <small>{activities.length} activities</small>
              </button>

              {expanded[discipline] ? (
                <div className="wbs-table-wrap">
                  <table className="wbs-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Activity</th>
                        <th>Unit</th>
                        <th>Baseline Qty</th>
                        <th>Installed Qty</th>
                        <th>Weight</th>
                        <th>Progress</th>
                        <th>Planned Start</th>
                        <th>Planned Finish</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {activities.map((activity) => {
                        const progress = calculateProgress(activity);
                        const rowSaving = savingId === activity.id || savingId === activity.code;

                        return (
                          <tr key={activity.id}>
                            <td>
                              <input
                                value={activity.code}
                                onChange={(event) => updateRow(activity.id, "code", event.target.value)}
                              />
                            </td>
                            <td className="wbs-activity-name">
                              <input
                                value={activity.name}
                                onChange={(event) => updateRow(activity.id, "name", event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                value={activity.unit}
                                onChange={(event) => updateRow(activity.id, "unit", event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={activity.baselineQuantity}
                                onChange={(event) => updateRow(activity.id, "baselineQuantity", event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={activity.installedQuantity}
                                onChange={(event) => updateRow(activity.id, "installedQuantity", event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.001"
                                value={activity.weightPercent}
                                onChange={(event) => updateRow(activity.id, "weightPercent", event.target.value)}
                              />
                            </td>
                            <td>
                              <div className="wbs-progress-cell">
                                <strong>{formatNumber(progress, 1)}%</strong>
                                <div>
                                  <span style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <input
                                type="date"
                                value={activity.plannedStart || ""}
                                onChange={(event) => updateRow(activity.id, "plannedStart", event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                value={activity.plannedFinish || ""}
                                onChange={(event) => updateRow(activity.id, "plannedFinish", event.target.value)}
                              />
                            </td>
                            <td>
                              <select
                                value={activity.status}
                                onChange={(event) => updateRow(activity.id, "status", event.target.value)}
                              >
                                {STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div className="wbs-row-actions">
                                <button
                                  type="button"
                                  className="wbs-open-activity"
                                  onClick={() => setSelectedActivity(activity)}
                                  disabled={rowSaving}
                                >
                                  Open
                                </button>
                                <button type="button" onClick={() => saveRow(activity)} disabled={rowSaving}>
                                  {rowSaving ? "Saving" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => deleteActivity(activity)}
                                  disabled={rowSaving}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    className="wbs-add-inline"
                    onClick={() => addActivity(discipline)}
                  >
                    + Add activity to {DISCIPLINE_LABELS[discipline] || discipline}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
      <ActivityDrawer
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        onChange={updateSelectedActivity}
        onSave={saveRow}
        onDelete={deleteActivity}
        saving={Boolean(savingId)}
      />
    </div>
  );
}
