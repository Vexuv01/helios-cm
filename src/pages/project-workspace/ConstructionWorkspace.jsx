import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import { loadProjectWbs, saveWbsActivity } from "../../features/wbs/services/wbsService";
import {
  getCurrentWeekRange,
  loadWeeklyWorkspace,
  saveWeeklyQuantity,
} from "../../features/weekly/services/weeklyService";
import ActivityPhotos from "../../features/construction-photos/ActivityPhotos";
import "../../styles/construction-workspace.css";

function n(value) {
  return Number(value || 0);
}

function pct(value) {
  return `${n(value).toFixed(1)}%`;
}

function progress(activity) {
  if (!activity || n(activity.baselineQuantity) <= 0) return 0;
  return Math.min((n(activity.installedQuantity) / n(activity.baselineQuantity)) * 100, 100);
}

export default function ConstructionWorkspace() {
  const { projectId } = useProject();
  const week = getCurrentWeekRange();

  const [mode, setMode] = useState("EXECUTION");
  const [activityTab, setActivityTab] = useState("OVERVIEW");
  const [snapshot, setSnapshot] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [weeklyQty, setWeeklyQty] = useState(0);
  const [weeklyNotes, setWeeklyNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [wbsData, weeklyData] = await Promise.all([
        loadProjectWbs(projectId),
        loadWeeklyWorkspace(projectId, week.weekStart, week.weekEnd),
      ]);

      setSnapshot(wbsData);
      setWeekly(weeklyData);

      setSelectedActivity((current) => {
        if (!current) return wbsData.activities?.[0] || null;
        return wbsData.activities.find((item) => item.id === current.id) || wbsData.activities?.[0] || null;
      });
    } catch (err) {
      setError(err.message || "Unable to load workspace");
    } finally {
      setLoading(false);
    }
  }, [projectId, week.weekEnd, week.weekStart]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const activityId = selectedActivity?.id;
    if (!activityId || !weekly?.rows) return;

    const row = weekly.rows.find((item) => item.activity.id === activityId);
    setWeeklyQty(row?.quantityThisWeek || 0);
    setWeeklyNotes(row?.notes || "");
  }, [selectedActivity?.id, weekly?.rows]);

  const grouped = useMemo(() => {
    return (snapshot?.activities || []).reduce((acc, activity) => {
      const key = activity.discipline || "GENERAL";
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    }, {});
  }, [snapshot?.activities]);

  function selectActivity(activity) {
    setSelectedActivity(activity);
    setActivityTab("OVERVIEW");

    const row = weekly?.rows?.find((item) => item.activity.id === activity.id);
    setWeeklyQty(row?.quantityThisWeek || 0);
    setWeeklyNotes(row?.notes || "");
  }

  function updateActivity(field, value) {
    setSelectedActivity((current) => ({ ...current, [field]: value }));
  }

  async function saveExecution() {
    if (!selectedActivity || !weekly?.report?.id) return;

    setSaving(true);
    setError("");

    try {
      await saveWbsActivity(projectId, selectedActivity);

      await saveWeeklyQuantity({
        projectId,
        weeklyReportId: weekly.report.id,
        wbsActivityId: selectedActivity.id,
        quantityThisWeek: weeklyQty,
        notes: weeklyNotes,
      });

      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Unable to save execution update");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="cw-empty">Loading Construction Workspace...</p>;
  if (error) return <div className="cw-error">{error}</div>;

  return (
    <div className="cw-page">
      <header className="cw-header">
        <div>
          <span>HELIOS Construction Workspace</span>
          <h2>Activity Command Center</h2>
          <p>
            Una sola area operativa: baseline, planning, weekly production,
            execution status e note di cantiere.
          </p>
        </div>

        <div className="cw-header-actions">
          <strong>{pct(snapshot?.overallProgress)}</strong>

          <div className="cw-mode-toggle">
            <button
              type="button"
              className={mode === "PLANNING" ? "active" : ""}
              onClick={() => setMode("PLANNING")}
            >
              Planning
            </button>
            <button
              type="button"
              className={mode === "EXECUTION" ? "active" : ""}
              onClick={() => setMode("EXECUTION")}
            >
              Execution
            </button>
          </div>
        </div>
      </header>

      <main className="cw-shell">
        <aside className="cw-tree">
          <div className="cw-tree-title">
            <span>{mode === "PLANNING" ? "Planning Mode" : "Execution Mode"}</span>
            <h3>WBS Activities</h3>
          </div>

          <div className="cw-tree-list">
            {Object.entries(grouped).map(([discipline, disciplineActivities]) => (
              <section key={discipline} className="cw-tree-group">
                <div className="cw-tree-group-head">
                  <strong>{discipline}</strong>
                  <span>{disciplineActivities.length} activities</span>
                </div>

                <div className="cw-tree-activities">
                  {disciplineActivities.map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      className={selectedActivity?.id === activity.id ? "active" : ""}
                      onClick={() => selectActivity(activity)}
                    >
                      <div>
                        <strong>{activity.name}</strong>
                        <span>{activity.code}</span>
                      </div>
                      <b>{pct(progress(activity))}</b>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="cw-activity">
          {selectedActivity ? (
            <>
              <header className="cw-activity-header">
                <div>
                  <span>{mode === "PLANNING" ? "Planning Activity" : "Execution Activity"}</span>
                  <h3>{selectedActivity.name}</h3>
                  <p>
                    {selectedActivity.code} · {selectedActivity.discipline} ·{" "}
                    {selectedActivity.unit}
                  </p>
                </div>

                {mode === "EXECUTION" && (
                  <button type="button" onClick={saveExecution} disabled={saving}>
                    {saving ? "Saving..." : "Save Execution"}
                  </button>
                )}
              </header>

              <section className="cw-execution-summary">
                <article>
                  <span>Baseline</span>
                  <strong>
                    {n(selectedActivity.baselineQuantity).toFixed(2)} {selectedActivity.unit}
                  </strong>
                </article>
                <article>
                  <span>Installed</span>
                  <strong>
                    {n(selectedActivity.installedQuantity).toFixed(2)} {selectedActivity.unit}
                  </strong>
                </article>
                <article>
                  <span>Remaining</span>
                  <strong>
                    {Math.max(
                      n(selectedActivity.baselineQuantity) - n(selectedActivity.installedQuantity),
                      0
                    ).toFixed(2)}{" "}
                    {selectedActivity.unit}
                  </strong>
                </article>
                <article>
                  <span>Progress</span>
                  <strong>{pct(progress(selectedActivity))}</strong>
                </article>
              </section>

              <nav className="cw-activity-tabs">
                {["OVERVIEW", "WEEKLY", "PHOTOS", "DOCUMENTS", "ISSUES", "DECISIONS"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activityTab === tab ? "active" : ""}
                    onClick={() => setActivityTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              {activityTab === "OVERVIEW" && (
                <section className="cw-progress-panel">
                  <span>Activity Progress</span>
                  <strong>{pct(progress(selectedActivity))}</strong>
                  <div>
                    <i style={{ width: `${progress(selectedActivity)}%` }} />
                  </div>
                </section>
              )}

              {activityTab === "PHOTOS" && (
                <ActivityPhotos
                  projectId={projectId}
                  activityId={selectedActivity.id}
                  weeklyReportId={weekly?.report?.id}
                />
              )}

              {activityTab !== "OVERVIEW" &&
                activityTab !== "WEEKLY" &&
                activityTab !== "PHOTOS" && (
                  <section className="cw-operational-card">
                    <div className="cw-section-title">
                      <span>{activityTab}</span>
                      <h4>{activityTab.toLowerCase()} workspace</h4>
                    </div>
                    <p className="cw-placeholder">
                      Sezione pronta per Sprint successivo. Sarà collegata ad attività WBS,
                      Weekly Report e Supabase.
                    </p>
                  </section>
                )}

              {(activityTab === "OVERVIEW" || activityTab === "WEEKLY") && mode === "PLANNING" ? (
                <section className="cw-operational-card">
                  <div className="cw-section-title">
                    <span>Baseline & Planning</span>
                    <h4>Planning data</h4>
                  </div>

                  <div className="cw-activity-grid">
                    <label>
                      Baseline Quantity
                      <input
                        type="number"
                        step="0.01"
                        value={selectedActivity.baselineQuantity || ""}
                        onChange={(e) => updateActivity("baselineQuantity", e.target.value)}
                      />
                    </label>

                    <label>
                      Planned Start
                      <input
                        type="date"
                        value={selectedActivity.plannedStart || ""}
                        onChange={(e) => updateActivity("plannedStart", e.target.value)}
                      />
                    </label>

                    <label>
                      Planned Finish
                      <input
                        type="date"
                        value={selectedActivity.plannedFinish || ""}
                        onChange={(e) => updateActivity("plannedFinish", e.target.value)}
                      />
                    </label>

                    <label>
                      Status
                      <select
                        value={selectedActivity.status || "BASELINE"}
                        onChange={(e) => updateActivity("status", e.target.value)}
                      >
                        <option value="BASELINE">BASELINE</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ON_HOLD">ON_HOLD</option>
                      </select>
                    </label>
                  </div>

                  <div className="cw-save-inline">
                    <button type="button" onClick={saveExecution} disabled={saving}>
                      {saving ? "Saving..." : "Save Planning"}
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <section className="cw-operational-card">
                    <div className="cw-section-title">
                      <span>This Week</span>
                      <h4>Weekly Production</h4>
                    </div>

                    <div className="cw-activity-grid">
                      <label>
                        Installed this week
                        <input
                          type="number"
                          step="0.01"
                          value={weeklyQty}
                          onChange={(e) => setWeeklyQty(e.target.value)}
                        />
                      </label>

                      <label>
                        Actual Start
                        <input
                          type="date"
                          value={selectedActivity.actualStart || ""}
                          onChange={(e) => updateActivity("actualStart", e.target.value)}
                        />
                      </label>

                      <label>
                        Actual Finish
                        <input
                          type="date"
                          value={selectedActivity.actualFinish || ""}
                          onChange={(e) => updateActivity("actualFinish", e.target.value)}
                        />
                      </label>

                      <label>
                        Status
                        <select
                          value={selectedActivity.status || "BASELINE"}
                          onChange={(e) => updateActivity("status", e.target.value)}
                        >
                          <option value="BASELINE">BASELINE</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="ON_HOLD">ON_HOLD</option>
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="cw-notes">
                    <label>
                      Weekly Notes
                      <textarea
                        value={weeklyNotes}
                        onChange={(e) => setWeeklyNotes(e.target.value)}
                        placeholder="Note operative, impedimenti, squadre, materiali, decisioni..."
                      />
                    </label>
                  </section>
                </>
              )}
            </>
          ) : (
            <p className="cw-empty">Select an activity.</p>
          )}
        </section>
      </main>
    </div>
  );
}
