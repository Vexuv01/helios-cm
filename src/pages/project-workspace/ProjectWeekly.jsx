import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import {
  getCurrentWeekRange,
  loadWeeklyWorkspace,
  saveWeeklyQuantity,
} from "../../features/weekly/services/weeklyService";
import "../../styles/weekly.css";

export default function ProjectWeekly() {
  const { currentProject, projectId } = useProject();
  const defaultWeek = getCurrentWeekRange();

  const [weekStart, setWeekStart] = useState(defaultWeek.weekStart);
  const [weekEnd, setWeekEnd] = useState(defaultWeek.weekEnd);
  const [workspace, setWorkspace] = useState(null);
  const [savingActivityId, setSavingActivityId] = useState("");
  const [draftValues, setDraftValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshWeekly = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await loadWeeklyWorkspace(projectId, weekStart, weekEnd);
      setWorkspace(data);

      const values = {};
      data.rows.forEach((row) => {
        values[row.activity.id] = row.quantityThisWeek;
      });
      setDraftValues(values);
    } catch (err) {
      setError(err.message || "Unable to load Weekly");
    } finally {
      setLoading(false);
    }
  }, [projectId, weekStart, weekEnd]);

  useEffect(() => {
    refreshWeekly();
  }, [refreshWeekly]);

  function updateQuantity(activityId, value) {
    setDraftValues((current) => ({
      ...current,
      [activityId]: value,
    }));
  }

  async function saveQuantity(activityId) {
    if (!workspace?.report?.id) return;

    setSavingActivityId(activityId);
    setError("");

    try {
      await saveWeeklyQuantity({
        projectId,
        weeklyReportId: workspace.report.id,
        wbsActivityId: activityId,
        quantityThisWeek: Number(draftValues[activityId] || 0),
      });

      await refreshWeekly();
    } catch (err) {
      setError(err.message || "Unable to save weekly quantity");
    } finally {
      setSavingActivityId("");
    }
  }

  const totalThisWeek = Object.values(draftValues).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return (
    <div className="weekly-page">
      <header className="workspace-page-header">
        <h2>Weekly Production</h2>
        <p>
          EPC weekly production input for {currentProject?.name}. Quantities
          entered here update the WBS installed quantity and refresh the
          Construction Engine automatically.
        </p>
      </header>

      {error ? <div className="weekly-error">{error}</div> : null}

      <section className="weekly-toolbar">
        <div>
          <span>Weekly Report</span>
          <strong>{workspace?.report?.status || "DRAFT"}</strong>
        </div>

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
          <strong>{Number(totalThisWeek || 0).toFixed(2)}</strong>
        </div>
      </section>

      <section className="weekly-table-panel">
        <div className="weekly-panel-heading">
          <div>
            <h3>WBS Activities</h3>
            <p>
              Enter only weekly quantities. Progress is calculated by HELIOS.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="weekly-empty">Loading Weekly...</p>
        ) : !workspace?.rows?.length ? (
          <p className="weekly-empty">
            No WBS activities found. Create the WBS baseline first.
          </p>
        ) : (
          <div className="weekly-table-wrap">
            <table className="weekly-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Activity</th>
                  <th>Discipline</th>
                  <th>Baseline</th>
                  <th>Installed</th>
                  <th>Remaining</th>
                  <th>This Week</th>
                  <th>Progress</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {workspace.rows.map(({ activity }) => (
                  <tr key={activity.id}>
                    <td>
                      <strong>{activity.code}</strong>
                    </td>
                    <td>{activity.name}</td>
                    <td>{activity.discipline}</td>
                    <td>
                      {Number(activity.baselineQuantity || 0).toFixed(2)}{" "}
                      {activity.unit}
                    </td>
                    <td>
                      {Number(activity.installedQuantity || 0).toFixed(2)}{" "}
                      {activity.unit}
                    </td>
                    <td>
                      {Number(activity.remainingQuantity || 0).toFixed(2)}{" "}
                      {activity.unit}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={draftValues[activity.id] ?? 0}
                        onChange={(event) =>
                          updateQuantity(activity.id, event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <div className="weekly-progress">
                        <span>
                          {Number(activity.progress || 0).toFixed(1)}%
                        </span>
                        <div>
                          <b
                            style={{
                              width: `${Number(activity.progress || 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => saveQuantity(activity.id)}
                        disabled={savingActivityId === activity.id}
                      >
                        {savingActivityId === activity.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
