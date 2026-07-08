import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { buildWbsWeightModel } from "../../services/wbsWeightEngine";
import "../../styles/construction-workspace.css";

const DEFAULT_CATEGORIES = [
  "Engineering",
  "Procurement",
  "Civil",
  "Mechanical",
  "Electrical",
  "Grid",
  "Commissioning",
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOperationalActivity(activity) {
  return activity.is_group !== true;
}

export default function ConstructionWorkspace() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [newActivityCategory, setNewActivityCategory] = useState("Civil");

  const weightedModel = useMemo(() => buildWbsWeightModel(activities), [activities]);

  const baselineActivities = useMemo(
    () => weightedModel.rows.filter((activity) => activity.is_leaf),
    [weightedModel.rows]
  );

  const categories = useMemo(() => {
    const fromData = baselineActivities
      .map((activity) => activity.discipline)
      .filter(Boolean);

    return [...new Set([...DEFAULT_CATEGORIES, ...fromData])];
  }, [baselineActivities]);

  const visibleActivities = useMemo(() => {
    return baselineActivities.filter((activity) => {
      const matchSearch =
        !search ||
        activity.code.toLowerCase().includes(search.toLowerCase()) ||
        activity.name.toLowerCase().includes(search.toLowerCase()) ||
        activity.discipline.toLowerCase().includes(search.toLowerCase());

      const matchCategory = category === "all" || activity.discipline === category;

      return matchSearch && matchCategory;
    });
  }, [baselineActivities, category, search]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId]
  );

  const metrics = useMemo(() => {
    const totalWeight = baselineActivities.reduce(
      (sum, item) => sum + toNumber(item.weight_percent),
      0
    );

    const totalQty = baselineActivities.reduce(
      (sum, item) => sum + toNumber(item.baseline_quantity),
      0
    );

    return {
      activities: baselineActivities.length,
      totalWeight: Number(totalWeight.toFixed(2)),
      totalQty,
      validWeight: Math.abs(totalWeight - 100) < 0.01,
    };
  }, [baselineActivities]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);

    const { data: projectRows } = await supabase
      .from("projects")
      .select("*")
      .order("code", { ascending: true });

    const nextProjects = projectRows || [];
    const nextProjectId = routeProjectId || projectId || nextProjects[0]?.id || "";

    setProjects(nextProjects);
    setProjectId(nextProjectId);

    if (!nextProjectId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const { data: wbsRows, error } = await supabase
      .from("wbs_activities")
      .select("*")
      .eq("project_id", nextProjectId)
      .order("sort_order", { ascending: true });

    if (error) alert(error.message);

    setActivities(wbsRows || []);
    setLoading(false);
  }, [projectId, routeProjectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  function updateActivity(activityId, field, value) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === activityId ? { ...activity, [field]: value } : activity
      )
    );
  }

  async function addActivity() {
    const maxSort = Math.max(0, ...activities.map((activity) => Number(activity.sort_order || 0)));
    const prefix = newActivityCategory.slice(0, 3).toUpperCase();
    const count = baselineActivities.filter(
      (activity) => activity.discipline === newActivityCategory
    ).length;

    const { error } = await supabase.from("wbs_activities").insert({
      project_id: projectId,
      parent_id: null,
      code: `${prefix}.${String(count + 1).padStart(2, "0")}`,
      name: "Nuova attività",
      discipline: newActivityCategory,
      unit: "unit",
      baseline_quantity: 0,
      weight_percent: 0,
      planned_start: null,
      planned_finish: null,
      sort_order: maxSort + 1,
      status: "not_started",
    });

    if (error) alert(error.message);
    await loadWorkspace();
  }

  async function saveActivity(activity) {
    const { error } = await supabase
      .from("wbs_activities")
      .update({
        parent_id: null,
        code: activity.code,
        name: activity.name,
        discipline: activity.discipline,
        unit: activity.unit,
        baseline_quantity: toNumber(activity.baseline_quantity),
        weight_percent: toNumber(activity.weight_percent),
        planned_start: activity.planned_start || null,
        planned_finish: activity.planned_finish || null,
        status: activity.status || "not_started",
      })
      .eq("id", activity.id);

    if (error) alert(error.message);
    await loadWorkspace();
  }

  async function deleteActivity(activity) {
    if (!window.confirm(`Eliminare ${activity.code} · ${activity.name}?`)) return;

    const { error } = await supabase.from("wbs_activities").delete().eq("id", activity.id);

    if (error) alert(error.message);
    await loadWorkspace();
  }

  return (
    <main className="construction-workspace">
      <header className="cw-workspace-header">
        <div>
          <span>PM Planning Area</span>
          <h1>Construction Baseline</h1>
          <p>Una riga = una lavorazione reale. Il Weight % è sempre riferito al progetto.</p>
        </div>

        <div className="cw-project-select">
          <label>Project</label>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="cw-metrics">
        <div>
          <span>Project</span>
          <strong>{selectedProject ? `${selectedProject.code} · ${selectedProject.name}` : "—"}</strong>
        </div>
        <div>
          <span>Activities</span>
          <strong>{metrics.activities}</strong>
        </div>
        <div>
          <span>Total Weight</span>
          <strong className={metrics.validWeight ? "weight-good" : "weight-bad"}>
            {metrics.totalWeight}%
          </strong>
        </div>
        <div>
          <span>Baseline Qty</span>
          <strong>{metrics.totalQty}</strong>
        </div>
        <div>
          <span>Validation</span>
          <strong>{metrics.validWeight ? "OK" : "Check"}</strong>
        </div>
      </section>

      <section className="weight-validation-strip">
        {weightedModel.validation.map((item) => (
          <div key={item.parentId} className={item.ok ? "weight-ok" : "weight-alert"}>
            <strong>{item.label}</strong>
            <span>{item.total}%</span>
          </div>
        ))}
      </section>

      <section className="cw-toolbar baseline-toolbar">
        <input
          placeholder="Search baseline activity..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={newActivityCategory}
          onChange={(event) => setNewActivityCategory(event.target.value)}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              New in {item}
            </option>
          ))}
        </select>

        <button type="button" onClick={addActivity}>
          + Activity
        </button>
      </section>

      <section className="cw-grid-shell excel-shell">
        {loading ? (
          <div className="cw-empty">Loading Construction Baseline...</div>
        ) : (
          <table className="cw-grid baseline-grid">
            <thead>
              <tr>
                <th>Code</th>
                <th>Category</th>
                <th>Activity</th>
                <th>U.M.</th>
                <th>Baseline Qty</th>
                <th>Weight %</th>
                <th>Planned Start</th>
                <th>Planned Finish</th>
                <th>Status</th>
                <th>Save</th>
                <th>Delete</th>
              </tr>
            </thead>

            <tbody>
              {visibleActivities.map((activity) => (
                <tr key={activity.id}>
                  <td>
                    <input
                      value={activity.code}
                      onChange={(event) => updateActivity(activity.id, "code", event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={activity.discipline}
                      onChange={(event) =>
                        updateActivity(activity.id, "discipline", event.target.value)
                      }
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="baseline-activity-cell">
                    <input
                      value={activity.name}
                      onChange={(event) => updateActivity(activity.id, "name", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={activity.unit}
                      onChange={(event) => updateActivity(activity.id, "unit", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={activity.baseline_quantity}
                      onChange={(event) =>
                        updateActivity(activity.id, "baseline_quantity", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={activity.weight_percent}
                      onChange={(event) =>
                        updateActivity(activity.id, "weight_percent", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={activity.planned_start || ""}
                      onChange={(event) =>
                        updateActivity(activity.id, "planned_start", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={activity.planned_finish || ""}
                      onChange={(event) =>
                        updateActivity(activity.id, "planned_finish", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={activity.status || "not_started"}
                      onChange={(event) => updateActivity(activity.id, "status", event.target.value)}
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td>
                    <button type="button" onClick={() => saveActivity(activity)}>
                      Save
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="cw-delete-row"
                      onClick={() => deleteActivity(activity)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
