import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import { loadProjectWbs, saveWbsActivity } from "../../features/wbs/services/wbsService";
import "../../styles/construction-workspace.css";

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function numberValue(value) {
  return Number(value || 0);
}

function getProgress(activity) {
  const baseline = numberValue(activity.baselineQuantity);
  const installed = numberValue(activity.installedQuantity);
  if (baseline <= 0) return 0;
  return Math.min((installed / baseline) * 100, 100);
}

export default function ConstructionWorkspace() {
  const { projectId } = useProject();

  const [snapshot, setSnapshot] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await loadProjectWbs(projectId);
      setSnapshot(data);
      setSelectedActivity((current) => current || data.activities?.[0] || null);
    } catch (err) {
      setError(err.message || "Unable to load Construction Workspace");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const grouped = useMemo(() => {
    if (!snapshot?.activities) return {};

    return snapshot.activities.reduce((acc, activity) => {
      const discipline = activity.discipline || "GENERAL";
      if (!acc[discipline]) acc[discipline] = [];
      acc[discipline].push(activity);
      return acc;
    }, {});
  }, [snapshot]);

  function updateSelected(field, value) {
    setSelectedActivity((current) => ({ ...current, [field]: value }));
  }

  async function saveSelected() {
    if (!selectedActivity) return;

    setSaving(true);
    setError("");

    try {
      const saved = await saveWbsActivity(projectId, selectedActivity);
      setSelectedActivity(saved);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Unable to save activity");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="cw-empty">Loading Construction Workspace...</p>;
  if (error) return <div className="cw-error">{error}</div>;
  if (!snapshot?.activities?.length) return <p className="cw-empty">No WBS baseline available.</p>;

  return (
    <div className="cw-page">
      <header className="cw-header">
        <div>
          <span>HELIOS Construction Workspace</span>
          <h2>Construction Operations</h2>
          <p>Tree operativo a sinistra, scheda attività a destra. Qui il team lavora davvero sul cantiere.</p>
        </div>

        <strong>{formatPercent(snapshot.overallProgress)}</strong>
      </header>

      <main className="cw-shell">
        <aside className="cw-tree">
          <div className="cw-tree-title">
            <span>Baseline</span>
            <h3>Construction Tree</h3>
          </div>

          <div className="cw-tree-list">
            {Object.entries(grouped).map(([discipline, activities]) => (
              <section key={discipline} className="cw-tree-group">
                <div className="cw-tree-group-head">
                  <strong>{discipline}</strong>
                  <span>{activities.length} activities</span>
                </div>

                <div className="cw-tree-activities">
                  {activities.map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      className={selectedActivity?.id === activity.id ? "active" : ""}
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <div>
                        <strong>{activity.name}</strong>
                        <span>{activity.code}</span>
                      </div>
                      <b>{formatPercent(getProgress(activity))}</b>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="cw-activity">
          {!selectedActivity ? (
            <p className="cw-empty">Select an activity.</p>
          ) : (
            <>
              <header className="cw-activity-header">
                <div>
                  <span>Construction Activity</span>
                  <h3>{selectedActivity.code} · {selectedActivity.name}</h3>
                  <p>{selectedActivity.discipline}</p>
                </div>

                <button type="button" onClick={saveSelected} disabled={saving}>
                  {saving ? "Saving..." : "Save Activity"}
                </button>
              </header>

              <div className="cw-activity-grid">
                <label>
                  Activity Name
                  <input value={selectedActivity.name || ""} onChange={(e) => updateSelected("name", e.target.value)} />
                </label>

                <label>
                  Code
                  <input value={selectedActivity.code || ""} onChange={(e) => updateSelected("code", e.target.value)} />
                </label>

                <label>
                  Discipline
                  <input value={selectedActivity.discipline || ""} onChange={(e) => updateSelected("discipline", e.target.value)} />
                </label>

                <label>
                  Contractor
                  <input value={selectedActivity.contractor || ""} onChange={(e) => updateSelected("contractor", e.target.value)} />
                </label>

                <label>
                  System
                  <input value={selectedActivity.system || ""} onChange={(e) => updateSelected("system", e.target.value)} />
                </label>

                <label>
                  Area
                  <input value={selectedActivity.area || ""} onChange={(e) => updateSelected("area", e.target.value)} />
                </label>

                <label>
                  Baseline Quantity
                  <input type="number" value={selectedActivity.baselineQuantity || 0} onChange={(e) => updateSelected("baselineQuantity", e.target.value)} />
                </label>

                <label>
                  Installed Quantity
                  <input type="number" value={selectedActivity.installedQuantity || 0} onChange={(e) => updateSelected("installedQuantity", e.target.value)} />
                </label>

                <label>
                  Weight %
                  <input type="number" step="0.001" value={selectedActivity.weightPercent || 0} onChange={(e) => updateSelected("weightPercent", e.target.value)} />
                </label>

                <label>
                  Unit
                  <input value={selectedActivity.unit || ""} onChange={(e) => updateSelected("unit", e.target.value)} />
                </label>

                <label>
                  Planned Start
                  <input type="date" value={selectedActivity.plannedStart || ""} onChange={(e) => updateSelected("plannedStart", e.target.value)} />
                </label>

                <label>
                  Planned Finish
                  <input type="date" value={selectedActivity.plannedFinish || ""} onChange={(e) => updateSelected("plannedFinish", e.target.value)} />
                </label>
              </div>

              <section className="cw-progress-panel">
                <span>Progress</span>
                <strong>{formatPercent(getProgress(selectedActivity))}</strong>
                <div>
                  <i style={{ width: `${getProgress(selectedActivity)}%` }} />
                </div>
              </section>

              <section className="cw-notes">
                <label>
                  Notes
                  <textarea
                    value={selectedActivity.remarks || ""}
                    onChange={(e) => updateSelected("remarks", e.target.value)}
                    placeholder="Note operative, vincoli, decisioni, commenti..."
                  />
                </label>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
