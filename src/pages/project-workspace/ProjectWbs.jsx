import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import {
  EMPTY_WBS_ACTIVITY,
  loadProjectWbs,
  removeWbsActivity,
  saveWbsActivity,
} from "../../features/wbs/services/wbsService";
import "../../styles/wbs.css";

const DISCIPLINES = [
  "ENGINEERING",
  "PROCUREMENT",
  "CIVIL",
  "MECHANICAL",
  "ELECTRICAL",
  "COMMISSIONING",
  "GRID_CONNECTION",
  "GENERAL",
];

const STATUSES = ["DRAFT", "BASELINE", "IN_PROGRESS", "COMPLETED", "ON_HOLD"];

export default function ProjectWbs() {
  const { currentProject, projectId } = useProject();

  const [wbs, setWbs] = useState({
    activities: [],
    totals: { baselineQuantity: 0, weightPercent: 0 },
    disciplines: [],
  });
  const [form, setForm] = useState(EMPTY_WBS_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(form.id);

  const refreshWbs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await loadProjectWbs(projectId);
      setWbs(data);
    } catch (err) {
      setError(err.message || "Unable to load WBS");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refreshWbs();
  }, [refreshWbs]);

  const disciplineSummary = useMemo(() => {
    return wbs.activities.reduce((acc, activity) => {
      const key = activity.discipline || "GENERAL";

      if (!acc[key]) {
        acc[key] = {
          discipline: key,
          activities: 0,
          weightPercent: 0,
          baselineQuantity: 0,
        };
      }

      acc[key].activities += 1;
      acc[key].weightPercent += Number(activity.weightPercent || 0);
      acc[key].baselineQuantity += Number(activity.baselineQuantity || 0);

      return acc;
    }, {});
  }, [wbs.activities]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(EMPTY_WBS_ACTIVITY);
    setError("");
  }

  function editActivity(activity) {
    setForm(activity);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitActivity(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await saveWbsActivity(projectId, form);
      resetForm();
      await refreshWbs();
    } catch (err) {
      setError(err.message || "Unable to save WBS activity");
    } finally {
      setSaving(false);
    }
  }

  async function deleteActivity(activity) {
    const confirmed = window.confirm(
      `Delete WBS activity ${activity.code} - ${activity.name}?`
    );

    if (!confirmed) return;

    setError("");

    try {
      await removeWbsActivity(activity.id);

      if (form.id === activity.id) {
        resetForm();
      }

      await refreshWbs();
    } catch (err) {
      setError(err.message || "Unable to delete WBS activity");
    }
  }

  return (
    <div className="wbs-page">
      <header className="workspace-page-header">
        <h2>WBS Baseline</h2>
        <p>
          Real construction work breakdown structure for {currentProject?.name}.
          Activities saved here become the baseline for Weekly production and
          the Construction Engine.
        </p>
      </header>

      {error ? <div className="wbs-error">{error}</div> : null}

      <section className="wbs-kpi-grid">
        <article>
          <span>Activities</span>
          <strong>{wbs.activities.length}</strong>
          <small>Supabase records</small>
        </article>
        <article>
          <span>Disciplines</span>
          <strong>{Object.keys(disciplineSummary).length}</strong>
          <small>Construction areas</small>
        </article>
        <article>
          <span>Total Weight</span>
          <strong>{Number(wbs.totals.weightPercent || 0).toFixed(2)}%</strong>
          <small>Target should be 100%</small>
        </article>
        <article>
          <span>Baseline Qty</span>
          <strong>{Number(wbs.totals.baselineQuantity || 0).toFixed(2)}</strong>
          <small>Total quantities</small>
        </article>
      </section>

      <section className="wbs-editor-grid">
        <form className="wbs-form" onSubmit={submitActivity}>
          <div className="wbs-panel-heading">
            <div>
              <h3>{isEditing ? "Edit Activity" : "New WBS Activity"}</h3>
              <p>
                Define construction activities by code, discipline, quantity and
                weight.
              </p>
            </div>

            {isEditing ? (
              <button type="button" className="wbs-secondary" onClick={resetForm}>
                New
              </button>
            ) : null}
          </div>

          <div className="wbs-form-grid">
            <label>
              Code
              <input
                name="code"
                value={form.code}
                onChange={updateForm}
                placeholder="CIV-001"
                required
              />
            </label>

            <label>
              Activity name
              <input
                name="name"
                value={form.name}
                onChange={updateForm}
                placeholder="Fence installation"
                required
              />
            </label>

            <label>
              Discipline
              <select
                name="discipline"
                value={form.discipline}
                onChange={updateForm}
              >
                {DISCIPLINES.map((discipline) => (
                  <option key={discipline} value={discipline}>
                    {discipline}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Unit
              <input
                name="unit"
                value={form.unit}
                onChange={updateForm}
                placeholder="ml, nr, MW, m²"
                required
              />
            </label>

            <label>
              Baseline quantity
              <input
                name="baselineQuantity"
                type="number"
                step="0.01"
                value={form.baselineQuantity}
                onChange={updateForm}
              />
            </label>

            <label>
              Weight %
              <input
                name="weightPercent"
                type="number"
                step="0.01"
                value={form.weightPercent}
                onChange={updateForm}
              />
            </label>

            <label>
              Planned start
              <input
                name="plannedStart"
                type="date"
                value={form.plannedStart}
                onChange={updateForm}
              />
            </label>

            <label>
              Planned finish
              <input
                name="plannedFinish"
                type="date"
                value={form.plannedFinish}
                onChange={updateForm}
              />
            </label>

            <label>
              Status
              <select name="status" value={form.status} onChange={updateForm}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sort order
              <input
                name="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={updateForm}
              />
            </label>
          </div>

          <div className="wbs-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : isEditing
                  ? "Update Activity"
                  : "Create Activity"}
            </button>
            <button type="button" className="wbs-secondary" onClick={resetForm}>
              Reset
            </button>
          </div>
        </form>

        <aside className="wbs-discipline-panel">
          <div className="wbs-panel-heading">
            <div>
              <h3>Discipline Summary</h3>
              <p>Live totals calculated from WBS records.</p>
            </div>
          </div>

          <div className="discipline-list">
            {Object.values(disciplineSummary).length === 0 ? (
              <p className="wbs-empty">No disciplines yet.</p>
            ) : (
              Object.values(disciplineSummary).map((item) => (
                <div key={item.discipline} className="discipline-row">
                  <div>
                    <strong>{item.discipline}</strong>
                    <span>{item.activities} activities</span>
                  </div>
                  <b>{Number(item.weightPercent || 0).toFixed(2)}%</b>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <section className="wbs-table-panel">
        <div className="wbs-panel-heading">
          <div>
            <h3>Activities</h3>
            <p>
              This is the real WBS list stored in Supabase for the selected
              project.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="wbs-empty">Loading WBS...</p>
        ) : wbs.activities.length === 0 ? (
          <p className="wbs-empty">
            No WBS activities yet. Create the first activity above.
          </p>
        ) : (
          <div className="wbs-table-wrap">
            <table className="wbs-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Activity</th>
                  <th>Discipline</th>
                  <th>Unit</th>
                  <th>Baseline</th>
                  <th>Weight</th>
                  <th>Planned</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {wbs.activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <strong>{activity.code}</strong>
                    </td>
                    <td>{activity.name}</td>
                    <td>{activity.discipline}</td>
                    <td>{activity.unit}</td>
                    <td>{Number(activity.baselineQuantity || 0).toFixed(2)}</td>
                    <td>{Number(activity.weightPercent || 0).toFixed(2)}%</td>
                    <td>
                      <span className="wbs-date">
                        {activity.plannedStart || "—"} →{" "}
                        {activity.plannedFinish || "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`wbs-status ${activity.status}`}>
                        {activity.status}
                      </span>
                    </td>
                    <td>
                      <div className="wbs-row-actions">
                        <button type="button" onClick={() => editActivity(activity)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteActivity(activity)}
                        >
                          Delete
                        </button>
                      </div>
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
