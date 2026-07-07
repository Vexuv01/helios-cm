import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import {
  getCurrentWeekRange,
  loadWeeklyWorkspace,
  saveWeeklyQuantity,
} from "../../features/weekly/services/weeklyService";
import "../../styles/weekly.css";

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

function numberValue(value) {
  return Number(value || 0);
}

function formatNumber(value, digits = 2) {
  return numberValue(value).toFixed(digits);
}

function calculateRemaining(activity) {
  return Math.max(
    numberValue(activity.baselineQuantity) - numberValue(activity.installedQuantity),
    0
  );
}

export default function ProjectWeekly() {
  const { currentProject, projectId } = useProject();
  const defaultWeek = getCurrentWeekRange();

  const [weekStart, setWeekStart] = useState(defaultWeek.weekStart);
  const [weekEnd, setWeekEnd] = useState(defaultWeek.weekEnd);
  const [workspace, setWorkspace] = useState(null);
  const [draftValues, setDraftValues] = useState({});
  const [draftNotes, setDraftNotes] = useState({});
  const [dirtyRows, setDirtyRows] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [savedRows, setSavedRows] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const autosaveTimer = useRef(null);

  const refreshWeekly = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await loadWeeklyWorkspace(projectId, weekStart, weekEnd);
      setWorkspace(data);

      const values = {};
      const notes = {};
      const initialExpanded = {};

      data.rows.forEach((row) => {
        values[row.activity.id] = row.quantityThisWeek;
        notes[row.activity.id] = row.notes || "";
        initialExpanded[row.activity.discipline || "GENERAL"] = true;
      });

      setDraftValues(values);
      setDraftNotes(notes);
      setDirtyRows({});
      setExpanded((current) =>
        Object.keys(current).length ? current : initialExpanded
      );
    } catch (err) {
      setError(err.message || "Unable to load Weekly");
    } finally {
      setLoading(false);
    }
  }, [projectId, weekStart, weekEnd]);

  useEffect(() => {
    refreshWeekly();
  }, [refreshWeekly]);

  const groupedRows = useMemo(() => {
    if (!workspace?.rows) return {};

    return workspace.rows.reduce((acc, row) => {
      const discipline = row.activity.discipline || "GENERAL";

      if (!acc[discipline]) acc[discipline] = [];

      acc[discipline].push(row);
      return acc;
    }, {});
  }, [workspace]);

  const totalThisWeek = Object.values(draftValues).reduce(
    (sum, value) => sum + numberValue(value),
    0
  );

  const activeRows = workspace?.rows?.filter(
    (row) =>
      numberValue(row.activity.baselineQuantity) > 0 ||
      numberValue(row.activity.installedQuantity) > 0 ||
      numberValue(draftValues[row.activity.id]) > 0
  );

  function markDirty(activityId) {
    setDirtyRows((current) => ({
      ...current,
      [activityId]: true,
    }));
  }

  function updateQuantity(activityId, value) {
    setDraftValues((current) => ({
      ...current,
      [activityId]: value,
    }));
    markDirty(activityId);
  }

  function updateNotes(activityId, value) {
    setDraftNotes((current) => ({
      ...current,
      [activityId]: value,
    }));
    markDirty(activityId);
  }

  function toggleDiscipline(discipline) {
    setExpanded((current) => ({
      ...current,
      [discipline]: !current[discipline],
    }));
  }

  useEffect(() => {
    if (!workspace?.report?.id) return;

    const dirtyIds = Object.keys(dirtyRows).filter((id) => dirtyRows[id]);

    if (dirtyIds.length === 0) return;

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(async () => {
      const idsToSave = Object.keys(dirtyRows).filter((id) => dirtyRows[id]);

      if (idsToSave.length === 0) return;

      setSavingRows((current) => {
        const next = { ...current };
        idsToSave.forEach((id) => {
          next[id] = true;
        });
        return next;
      });

      setError("");

      try {
        await Promise.all(
          idsToSave.map((activityId) =>
            saveWeeklyQuantity({
              projectId,
              weeklyReportId: workspace.report.id,
              wbsActivityId: activityId,
              quantityThisWeek: numberValue(draftValues[activityId]),
              notes: draftNotes[activityId] || "",
            })
          )
        );

        setDirtyRows((current) => {
          const next = { ...current };
          idsToSave.forEach((id) => {
            delete next[id];
          });
          return next;
        });

        setSavedRows((current) => {
          const next = { ...current };
          idsToSave.forEach((id) => {
            next[id] = true;
          });
          return next;
        });

        setTimeout(() => {
          setSavedRows((current) => {
            const next = { ...current };
            idsToSave.forEach((id) => {
              delete next[id];
            });
            return next;
          });
        }, 1800);
      } catch (err) {
        setError(err.message || "Unable to autosave Weekly");
      } finally {
        setSavingRows((current) => {
          const next = { ...current };
          idsToSave.forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }
    }, 700);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [dirtyRows, draftValues, draftNotes, projectId, workspace?.report?.id]);

  return (
    <div className="weekly-page">
      <header className="weekly-control-header">
        <div>
          <span className="weekly-eyebrow">HELIOS Weekly Workspace</span>
          <h2>{currentProject?.name}</h2>
          <p>
            Inserisci solo la produzione settimanale. HELIOS salva su Supabase,
            aggiorna le quantità installate e alimenta automaticamente Control Room e Forecast.
          </p>
        </div>

        <div className="weekly-status-card">
          <span>Report Status</span>
          <strong>{workspace?.report?.status || "DRAFT"}</strong>
          <small>Autosave attivo</small>
        </div>
      </header>

      {error ? <div className="weekly-error">{error}</div> : null}

      <section className="weekly-toolbar">
        <label>
          Week Start
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
        </label>

        <label>
          Week End
          <input
            type="date"
            value={weekEnd}
            onChange={(event) => setWeekEnd(event.target.value)}
          />
        </label>

        <div>
          <span>This Week Qty</span>
          <strong>{formatNumber(totalThisWeek)}</strong>
        </div>

        <div>
          <span>Active Rows</span>
          <strong>{activeRows?.length || 0}</strong>
        </div>
      </section>

      {loading ? (
        <p className="weekly-empty">Loading Weekly...</p>
      ) : !workspace?.rows?.length ? (
        <p className="weekly-empty">
          No WBS activities found. Create the WBS baseline first.
        </p>
      ) : (
        <section className="weekly-board">
          {Object.entries(groupedRows).map(([discipline, rows]) => (
            <article key={discipline} className="weekly-discipline">
              <button
                type="button"
                className="weekly-discipline-header"
                onClick={() => toggleDiscipline(discipline)}
              >
                <span>{expanded[discipline] ? "▾" : "▸"}</span>
                <strong>{DISCIPLINE_LABELS[discipline] || discipline}</strong>
                <small>{rows.length} activities</small>
              </button>

              {expanded[discipline] ? (
                <div className="weekly-card-list">
                  {rows.map(({ activity }) => {
                    const progress = numberValue(activity.progress);
                    const remaining = calculateRemaining(activity);
                    const isSaving = savingRows[activity.id];
                    const isSaved = savedRows[activity.id];
                    const isDirty = dirtyRows[activity.id];

                    return (
                      <div key={activity.id} className="weekly-activity-card">
                        <div className="weekly-activity-main">
                          <div>
                            <span className="weekly-code">{activity.code}</span>
                            <strong>{activity.name}</strong>
                            <small>
                              {formatNumber(activity.baselineQuantity)} {activity.unit} baseline ·{" "}
                              {formatNumber(activity.installedQuantity)} {activity.unit} installed ·{" "}
                              {formatNumber(remaining)} {activity.unit} remaining
                            </small>
                          </div>

                          <div className="weekly-save-state">
                            {isSaving ? "Saving..." : isSaved ? "Saved" : isDirty ? "Pending" : "Synced"}
                          </div>
                        </div>

                        <div className="weekly-card-grid">
                          <label>
                            This Week
                            <input
                              type="number"
                              step="0.01"
                              value={draftValues[activity.id] ?? 0}
                              onChange={(event) =>
                                updateQuantity(activity.id, event.target.value)
                              }
                            />
                          </label>

                          <label className="weekly-notes">
                            Notes
                            <textarea
                              value={draftNotes[activity.id] || ""}
                              onChange={(event) =>
                                updateNotes(activity.id, event.target.value)
                              }
                              placeholder="Note operative, impedimenti, materiali, squadre..."
                            />
                          </label>

                          <div className="weekly-progress">
                            <span>{formatNumber(progress, 1)}%</span>
                            <div>
                              <b style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
