import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { buildWbsWeightModel } from "../../services/wbsWeightEngine";
import "../../styles/construction-workspace.css";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCategory(activity, allActivities) {
  return allActivities.some((item) => item.parent_id === activity.id) || !activity.code.includes(".");
}

function getLevel(code = "") {
  return code.split(".").length;
}

export default function ConstructionWorkspace() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState("all");
  const [newParentId, setNewParentId] = useState("");

  const weightedModel = useMemo(() => buildWbsWeightModel(activities), [activities]);

  const weightedActivities = weightedModel.rows;
  const weightValidation = weightedModel.validation;

  const categories = useMemo(
    () => weightedActivities.filter((activity) => isCategory(activity, weightedActivities)),
    [weightedActivities]
  );

  const disciplines = useMemo(
    () => [...new Set(activities.map((activity) => activity.discipline).filter(Boolean))],
    [activities]
  );

  const visibleActivities = useMemo(() => {
    return weightedActivities.filter((activity) => {
      const matchSearch =
        !search ||
        activity.code.toLowerCase().includes(search.toLowerCase()) ||
        activity.name.toLowerCase().includes(search.toLowerCase()) ||
        activity.discipline.toLowerCase().includes(search.toLowerCase());

      const matchDiscipline = discipline === "all" || activity.discipline === discipline;

      return matchSearch && matchDiscipline;
    });
  }, [discipline, search, weightedActivities]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId]
  );

  const metrics = useMemo(() => {
    const operational = weightedActivities.filter((activity) => activity.is_leaf);
    const totalWeight = operational.reduce((sum, item) => sum + toNumber(item.real_weight_percent), 0);
    const totalQty = operational.reduce((sum, item) => sum + toNumber(item.baseline_quantity), 0);

    return {
      categories: categories.length,
      activities: operational.length,
      totalWeight,
      totalQty,
    };
  }, [categories.length, weightedActivities]);

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

  useEffect(() => {
    if (!newParentId && categories[0]?.id) {
      setNewParentId(categories[0].id);
    }
  }, [categories, newParentId]);

  function updateActivity(activityId, field, value) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === activityId ? { ...activity, [field]: value } : activity
      )
    );
  }

  async function addCategory() {
    const maxSort = Math.max(0, ...activities.map((activity) => Number(activity.sort_order || 0)));

    const { error } = await supabase.from("wbs_activities").insert({
      project_id: projectId,
      parent_id: null,
      code: "NEW",
      name: "Nuova categoria",
      discipline: "General",
      unit: "lot",
      baseline_quantity: 0,
      weight_percent: 0,
      sort_order: maxSort + 10,
      status: "not_started",
    });

    if (error) alert(error.message);
    await loadWorkspace();
  }

  async function addActivity() {
    const parent = categories.find((category) => category.id === newParentId);
    const maxSort = Math.max(0, ...activities.map((activity) => Number(activity.sort_order || 0)));
    const children = activities.filter((activity) => activity.parent_id === parent?.id);
    const code = parent ? `${parent.code}.${String(children.length + 1).padStart(2, "0")}` : "NEW.01";

    const { error } = await supabase.from("wbs_activities").insert({
      project_id: projectId,
      parent_id: parent?.id || null,
      code,
      name: "Nuova attività WBS",
      discipline: parent?.discipline || "General",
      unit: "unit",
      baseline_quantity: 0,
      weight_percent: 0,
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
        parent_id: activity.parent_id || null,
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
          <h1>WBS Planning</h1>
          <p>Baseline stile Excel: pesi, fasi, quantità e date programmate.</p>
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
          <span>Categories</span>
          <strong>{metrics.categories}</strong>
        </div>
        <div>
          <span>Activities</span>
          <strong>{metrics.activities}</strong>
        </div>
        <div>
          <span>Total Weight</span>
          <strong>{metrics.totalWeight}</strong>
        </div>
        <div>
          <span>Total Qty</span>
          <strong>{metrics.totalQty}</strong>
        </div>
      </section>

      <section className="weight-validation-strip">
        {weightValidation.map((item) => (
          <div key={item.parentId} className={item.ok ? "weight-ok" : "weight-alert"}>
            <strong>{item.label}</strong>
            <span>{item.total}%</span>
          </div>
        ))}
      </section>

      <section className="cw-toolbar wbs-planning-toolbar">
        <input
          placeholder="Search WBS..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={discipline} onChange={(event) => setDiscipline(event.target.value)}>
          <option value="all">All disciplines</option>
          {disciplines.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select value={newParentId} onChange={(event) => setNewParentId(event.target.value)}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.code} · {category.name}
            </option>
          ))}
        </select>

        <button type="button" onClick={addCategory}>+ Category</button>
        <button type="button" onClick={addActivity}>+ Activity</button>
      </section>

      <section className="cw-grid-shell excel-shell">
        {loading ? (
          <div className="cw-empty">Loading WBS...</div>
        ) : (
          <table className="cw-grid excel-wbs-grid">
            <thead>
              <tr>
                <th>Code</th>
                <th>Activity</th>
                <th>Level</th>
                <th>Parent</th>
                <th>Fase</th>
                <th>U.M.</th>
                <th>Quantity</th>
                <th>Local Weight %</th>
                <th>Real Weight %</th>
                <th>Planned Start</th>
                <th>Planned Finish</th>
                <th>Status</th>
                <th>Save</th>
                <th>Delete</th>
              </tr>
            </thead>

            <tbody>
              {visibleActivities.map((activity) => {
                const category = isCategory(activity, weightedActivities);

                return (
                  <tr key={activity.id} className={category ? "excel-category-row" : ""}>
                    <td>
                      <input
                        value={activity.code}
                        onChange={(event) => updateActivity(activity.id, "code", event.target.value)}
                      />
                    </td>
                    <td className={`excel-activity-cell level-${Math.min(activity.level, 3)}`}>
                      <input
                        value={activity.name}
                        onChange={(event) => updateActivity(activity.id, "name", event.target.value)}
                      />
                    </td>
                    <td>
                      <strong>L{activity.level}</strong>
                    </td>
                    <td>
                      <select
                        value={activity.parent_id || ""}
                        onChange={(event) => updateActivity(activity.id, "parent_id", event.target.value)}
                      >
                        <option value="">Root</option>
                        {categories
                          .filter((categoryItem) => categoryItem.id !== activity.id)
                          .map((categoryItem) => (
                            <option key={categoryItem.id} value={categoryItem.id}>
                              {categoryItem.code} · {categoryItem.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={activity.discipline}
                        onChange={(event) =>
                          updateActivity(activity.id, "discipline", event.target.value)
                        }
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
                      <strong className="real-weight">{activity.real_weight_percent}%</strong>
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
                      <button type="button" onClick={() => saveActivity(activity)}>Save</button>
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
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
