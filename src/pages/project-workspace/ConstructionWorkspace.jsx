import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/construction-workspace.css";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function progress(actual, baseline) {
  if (!baseline) return 0;
  return Math.min(100, Math.round((actual / baseline) * 100));
}

function isCategory(activity, allActivities) {
  return allActivities.some((item) => item.parent_id === activity.id) || !activity.code.includes(".");
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
  const [status, setStatus] = useState("all");
  const [newActivityCategoryId, setNewActivityCategoryId] = useState("");

  const categories = useMemo(
    () => activities.filter((activity) => isCategory(activity, activities)),
    [activities]
  );

  const operationalActivities = useMemo(
    () => activities.filter((activity) => !isCategory(activity, activities)),
    [activities]
  );

  const disciplines = useMemo(
    () => [...new Set(activities.map((activity) => activity.discipline).filter(Boolean))],
    [activities]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId]
  );

  const groupedActivities = useMemo(() => {
    return categories
      .map((category) => {
        const children = operationalActivities.filter((activity) => {
          const parentMatch = activity.parent_id === category.id;
          const codeMatch = activity.code?.startsWith(`${category.code}.`);
          const matchSearch =
            !search ||
            activity.code.toLowerCase().includes(search.toLowerCase()) ||
            activity.name.toLowerCase().includes(search.toLowerCase()) ||
            category.name.toLowerCase().includes(search.toLowerCase());

          const matchDiscipline = discipline === "all" || activity.discipline === discipline;
          const matchStatus = status === "all" || activity.status === status;

          return (parentMatch || codeMatch) && matchSearch && matchDiscipline && matchStatus;
        });

        const weight = children.reduce((sum, item) => sum + toNumber(item.weight_percent), 0);
        const weightedProgress = children.reduce(
          (sum, item) =>
            sum + progress(item.actual_quantity || 0, item.baseline_quantity) * toNumber(item.weight_percent),
          0
        );

        return {
          ...category,
          children,
          calculatedWeight: weight,
          calculatedProgress: weight ? Math.round(weightedProgress / weight) : 0,
        };
      })
      .filter((category) => {
        if (!search && discipline === "all" && status === "all") return true;
        return category.children.length > 0;
      });
  }, [activities, categories, discipline, operationalActivities, search, status]);

  const metrics = useMemo(() => {
    const totalWeight = operationalActivities.reduce(
      (sum, activity) => sum + toNumber(activity.weight_percent),
      0
    );

    const weightedProgress = operationalActivities.reduce(
      (sum, activity) =>
        sum + progress(activity.actual_quantity || 0, activity.baseline_quantity) * toNumber(activity.weight_percent),
      0
    );

    return {
      totalProgress: totalWeight ? Math.round(weightedProgress / totalWeight) : 0,
      totalActivities: operationalActivities.length,
      categories: categories.length,
      totalWeight,
    };
  }, [categories.length, operationalActivities]);

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
    if (!newActivityCategoryId && categories[0]?.id) {
      setNewActivityCategoryId(categories[0].id);
    }
  }, [categories, newActivityCategoryId]);

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
    const category = categories.find((item) => item.id === newActivityCategoryId) || categories[0];
    const maxSort = Math.max(0, ...activities.map((activity) => Number(activity.sort_order || 0)));
    const count = operationalActivities.filter((activity) => activity.parent_id === category?.id).length;
    const code = category ? `${category.code}.${String(count + 1).padStart(2, "0")}` : "NEW.01";

    const { error } = await supabase.from("wbs_activities").insert({
      project_id: projectId,
      parent_id: category?.id || null,
      code,
      name: "Nuova attività WBS",
      discipline: category?.discipline || "General",
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
          <p>Programmazione baseline: categorie, attività, pesi, quantità e date.</p>
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
          <span>Planned Progress</span>
          <strong>{metrics.totalProgress}%</strong>
        </div>
        <div>
          <span>Categories</span>
          <strong>{metrics.categories}</strong>
        </div>
        <div>
          <span>Activities</span>
          <strong>{metrics.totalActivities}</strong>
        </div>
        <div>
          <span>Total Weight</span>
          <strong>{metrics.totalWeight}</strong>
        </div>
      </section>

      <section className="cw-toolbar tree-toolbar">
        <input
          placeholder="Search category or WBS activity..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={discipline} onChange={(event) => setDiscipline(event.target.value)}>
          <option value="all">All disciplines</option>
          {disciplines.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All status</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={newActivityCategoryId}
          onChange={(event) => setNewActivityCategoryId(event.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.code} · {category.name}
            </option>
          ))}
        </select>

        <button type="button" onClick={addCategory}>+ Category</button>
        <button type="button" onClick={addActivity}>+ Activity</button>
      </section>

      <section className="cw-grid-shell">
        {loading ? (
          <div className="cw-empty">Loading WBS...</div>
        ) : (
          <table className="cw-grid cw-tree-grid">
            <thead>
              <tr>
                <th>Code</th>
                <th>Activity</th>
                <th>Category</th>
                <th>Discipline</th>
                <th>U.M.</th>
                <th>Baseline</th>
                <th>Weight</th>
                <th>Start</th>
                <th>Finish</th>
                <th>Status</th>
                <th>Save</th>
                <th>Delete</th>
              </tr>
            </thead>

            <tbody>
              {groupedActivities.map((category) => (
                <tr key={category.id} className="cw-category-block">
                  <td colSpan="12">
                    <div className="cw-category-title">
                      <strong>{category.code} · {category.name}</strong>
                      <span>
                        Weight {category.calculatedWeight} · Progress {category.calculatedProgress}%
                      </span>
                      <button type="button" onClick={() => saveActivity(category)}>Save Category</button>
                      <button type="button" className="cw-delete-row" onClick={() => deleteActivity(category)}>
                        Delete
                      </button>
                    </div>

                    <table className="cw-inner-table">
                      <tbody>
                        {category.children.map((activity) => (
                          <tr key={activity.id}>
                            <td>
                              <input value={activity.code} onChange={(e) => updateActivity(activity.id, "code", e.target.value)} />
                            </td>
                            <td className="cw-activity-name">
                              <input value={activity.name} onChange={(e) => updateActivity(activity.id, "name", e.target.value)} />
                            </td>
                            <td>
                              <select value={activity.parent_id || category.id} onChange={(e) => updateActivity(activity.id, "parent_id", e.target.value)}>
                                {categories.map((item) => (
                                  <option key={item.id} value={item.id}>{item.code} · {item.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input value={activity.discipline} onChange={(e) => updateActivity(activity.id, "discipline", e.target.value)} />
                            </td>
                            <td>
                              <input value={activity.unit} onChange={(e) => updateActivity(activity.id, "unit", e.target.value)} />
                            </td>
                            <td>
                              <input type="number" value={activity.baseline_quantity} onChange={(e) => updateActivity(activity.id, "baseline_quantity", e.target.value)} />
                            </td>
                            <td>
                              <input type="number" value={activity.weight_percent} onChange={(e) => updateActivity(activity.id, "weight_percent", e.target.value)} />
                            </td>
                            <td>
                              <input type="date" value={activity.planned_start || ""} onChange={(e) => updateActivity(activity.id, "planned_start", e.target.value)} />
                            </td>
                            <td>
                              <input type="date" value={activity.planned_finish || ""} onChange={(e) => updateActivity(activity.id, "planned_finish", e.target.value)} />
                            </td>
                            <td>
                              <select value={activity.status || "not_started"} onChange={(e) => updateActivity(activity.id, "status", e.target.value)}>
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
                              <button type="button" className="cw-delete-row" onClick={() => deleteActivity(activity)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
