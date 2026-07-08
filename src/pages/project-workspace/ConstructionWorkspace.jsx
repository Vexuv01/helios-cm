import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/construction-workspace.css";

function getWeekRange(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diffToMonday));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: friday.toISOString().slice(0, 10),
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function progress(actual, baseline) {
  if (!baseline) return 0;
  return Math.min(100, Math.round((actual / baseline) * 100));
}

function isCategory(activity, allActivities) {
  const hasChildren = allActivities.some((item) => item.parent_id === activity.id);
  const isRootCode = activity.code && !activity.code.includes(".");
  return hasChildren || isRootCode;
}

function getActivityParent(activity, categories) {
  if (activity.parent_id) return activity.parent_id;

  const prefix = activity.code?.split(".")[0];
  return categories.find((category) => category.code === prefix)?.id || "";
}

export default function ConstructionWorkspace() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");
  const [activities, setActivities] = useState([]);
  const [weeklyValues, setWeeklyValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState("all");
  const [status, setStatus] = useState("all");
  const [newActivityCategoryId, setNewActivityCategoryId] = useState("");

  const week = useMemo(() => getWeekRange(), []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId]
  );

  const categories = useMemo(
    () =>
      activities
        .filter((activity) => isCategory(activity, activities))
        .sort((a, b) => toNumber(a.sort_order) - toNumber(b.sort_order)),
    [activities]
  );

  const operationalActivities = useMemo(
    () => activities.filter((activity) => !isCategory(activity, activities)),
    [activities]
  );

  const groupedActivities = useMemo(() => {
    return categories.map((category) => {
      const children = operationalActivities
        .filter((activity) => getActivityParent(activity, categories) === category.id)
        .filter((activity) => {
          const matchSearch =
            activity.code.toLowerCase().includes(search.toLowerCase()) ||
            activity.name.toLowerCase().includes(search.toLowerCase());

          const matchDiscipline = discipline === "all" || activity.discipline === discipline;
          const matchStatus = status === "all" || activity.status === status;

          return matchSearch && matchDiscipline && matchStatus;
        });

      const categoryWeight = children.reduce(
        (sum, activity) => sum + toNumber(activity.weight_percent),
        0
      );

      const weightedProgress = children.reduce((sum, activity) => {
        const activityProgress = progress(activity.actual_quantity, activity.baseline_quantity);
        return sum + activityProgress * toNumber(activity.weight_percent);
      }, 0);

      return {
        ...category,
        children,
        calculatedWeight: categoryWeight,
        calculatedProgress: categoryWeight ? Math.round(weightedProgress / categoryWeight) : 0,
      };
    });
  }, [categories, discipline, operationalActivities, search, status]);

  const disciplines = useMemo(
    () => [...new Set(activities.map((activity) => activity.discipline).filter(Boolean))],
    [activities]
  );

  const metrics = useMemo(() => {
    const totalWeight = operationalActivities.reduce(
      (sum, activity) => sum + toNumber(activity.weight_percent),
      0
    );

    const weightedProgress = operationalActivities.reduce((sum, activity) => {
      const activityProgress = progress(activity.actual_quantity, activity.baseline_quantity);
      return sum + activityProgress * toNumber(activity.weight_percent);
    }, 0);

    const totalProgress = totalWeight ? Math.round(weightedProgress / totalWeight) : 0;
    const weeklyTotal = Object.values(weeklyValues).reduce((sum, value) => sum + toNumber(value), 0);

    return {
      totalProgress,
      totalActivities: operationalActivities.length,
      weeklyTotal,
      completed: operationalActivities.filter((activity) => activity.status === "completed").length,
      delayed: operationalActivities.filter((activity) => activity.status === "blocked").length,
    };
  }, [operationalActivities, weeklyValues]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);

    const { data: projectRows, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .order("code", { ascending: true });

    if (projectsError) {
      console.error(projectsError);
      setLoading(false);
      return;
    }

    const nextProjects = projectRows || [];
    const nextProjectId = routeProjectId || projectId || nextProjects[0]?.id || "";

    setProjects(nextProjects);
    setProjectId(nextProjectId);

    if (!nextProjectId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const { data: wbsRows, error: wbsError } = await supabase
      .from("wbs_activities")
      .select("*")
      .eq("project_id", nextProjectId)
      .order("sort_order", { ascending: true });

    if (wbsError) {
      console.error(wbsError);
      setLoading(false);
      return;
    }

    const { data: entryRows, error: entriesError } = await supabase
      .from("weekly_entries")
      .select("activity_id, wbs_activity_id, actual_quantity, project_id")
      .eq("project_id", nextProjectId);

    if (entriesError) {
      console.error(entriesError);
    }

    const actualByActivity = {};
    for (const entry of entryRows || []) {
      const activityId = entry.activity_id || entry.wbs_activity_id;
      actualByActivity[activityId] =
        toNumber(actualByActivity[activityId]) + toNumber(entry.actual_quantity);
    }

    setActivities(
      (wbsRows || []).map((activity) => ({
        ...activity,
        actual_quantity: actualByActivity[activity.id] || 0,
      }))
    );

    setWeeklyValues({});
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

  function updateBaseline(activityId, field, value) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === activityId ? { ...activity, [field]: value } : activity
      )
    );
  }

  async function addCategory() {
    if (!projectId) return;

    const maxSort = Math.max(0, ...activities.map((activity) => Number(activity.sort_order || 0)));

    const { error } = await supabase.from("wbs_activities").insert({
      project_id: projectId,
      parent_id: null,
      code: "NEW-CAT",
      name: "Nuova categoria",
      discipline: "General",
      unit: "lot",
      baseline_quantity: 0,
      weight_percent: 0,
      planned_start: null,
      planned_finish: null,
      sort_order: maxSort + 10,
      status: "not_started",
    });

    if (error) {
      alert(error.message);
      return;
    }

    await loadWorkspace();
  }

  async function addActivity() {
    if (!projectId) return;

    const category = categories.find((item) => item.id === newActivityCategoryId) || categories[0];
    const maxSort = Math.max(0, ...activities.map((activity) => Number(activity.sort_order || 0)));
    const childrenCount = operationalActivities.filter(
      (activity) => getActivityParent(activity, categories) === category?.id
    ).length;

    const nextCode = category ? `${category.code}.${String(childrenCount + 1).padStart(2, "0")}` : "NEW";

    const { error } = await supabase.from("wbs_activities").insert({
      project_id: projectId,
      parent_id: category?.id || null,
      code: nextCode,
      name: "Nuova attività WBS",
      discipline: category?.discipline || "General",
      unit: "unit",
      baseline_quantity: 0,
      weight_percent: 0,
      planned_start: null,
      planned_finish: null,
      sort_order: maxSort + 1,
      status: "not_started",
    });

    if (error) {
      alert(error.message);
      return;
    }

    await loadWorkspace();
  }

  async function deleteActivity(activity) {
    const confirmed = window.confirm(
      `Eliminare definitivamente questa voce WBS?\n\n${activity.code} · ${activity.name}`
    );

    if (!confirmed) return;

    const { error } = await supabase.from("wbs_activities").delete().eq("id", activity.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadWorkspace();
  }

  async function saveBaseline(activity) {
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
        status: activity.status,
      })
      .eq("id", activity.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadWorkspace();
  }

  async function saveWeekly() {
    if (!projectId) return;

    const rows = Object.entries(weeklyValues)
      .filter(([, value]) => toNumber(value) !== 0)
      .map(([activityId, value]) => ({
        activity_id: activityId,
        actual_quantity: toNumber(value),
      }));

    if (!rows.length) {
      alert("Inserisci almeno una quantità weekly.");
      return;
    }

    setSaving(true);

    const { data: report, error: reportError } = await supabase
      .from("weekly_reports")
      .upsert(
        {
          project_id: projectId,
          week_start: week.weekStart,
          week_end: week.weekEnd,
          status: "draft",
        },
        { onConflict: "project_id,week_start" }
      )
      .select("id")
      .single();

    if (reportError) {
      setSaving(false);
      alert(reportError.message);
      return;
    }

    const payload = rows.map((row) => ({
      project_id: projectId,
      weekly_report_id: report.id,
      activity_id: row.activity_id,
      wbs_activity_id: row.activity_id,
      actual_quantity: row.actual_quantity,
    }));

    const { error: entriesError } = await supabase
      .from("weekly_entries")
      .upsert(payload, { onConflict: "weekly_report_id,wbs_activity_id" });

    if (entriesError) {
      setSaving(false);
      alert(entriesError.message);
      return;
    }

    setSaving(false);
    await loadWorkspace();
  }

  return (
    <main className="construction-workspace">
      <header className="cw-workspace-header">
        <div>
          <span>HELIOS CM Enterprise</span>
          <h1>Construction Operating Grid</h1>
          <p>WBS ad albero, attività per categoria, weekly e progress reale.</p>
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
          <span>Total Progress</span>
          <strong>{metrics.totalProgress}%</strong>
        </div>
        <div>
          <span>Activities</span>
          <strong>{metrics.totalActivities}</strong>
        </div>
        <div>
          <span>This Weekly</span>
          <strong>{metrics.weeklyTotal}</strong>
        </div>
        <div>
          <span>Blocked</span>
          <strong>{metrics.delayed}</strong>
        </div>
      </section>

      <section className="cw-toolbar tree-toolbar">
        <input
          placeholder="Search WBS activity..."
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

        <button type="button" onClick={addCategory}>
          + Category
        </button>

        <button type="button" onClick={addActivity}>
          + Activity
        </button>

        <button type="button" onClick={saveWeekly} disabled={saving}>
          {saving ? "Saving..." : `Save Weekly ${week.weekStart}`}
        </button>
      </section>

      <section className="cw-grid-shell">
        {loading ? (
          <div className="cw-empty">Loading real WBS...</div>
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
                <th>Actual</th>
                <th>Weekly Qty</th>
                <th>Remaining</th>
                <th>Progress</th>
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
                <>
                  <tr key={category.id} className="cw-category-row">
                    <td>
                      <input
                        value={category.code}
                        onChange={(event) => updateBaseline(category.id, "code", event.target.value)}
                      />
                    </td>
                    <td className="cw-activity-name cw-category-name">
                      <input
                        value={category.name}
                        onChange={(event) => updateBaseline(category.id, "name", event.target.value)}
                      />
                    </td>
                    <td>Root</td>
                    <td>
                      <input
                        value={category.discipline}
                        onChange={(event) =>
                          updateBaseline(category.id, "discipline", event.target.value)
                        }
                      />
                    </td>
                    <td>{category.unit}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      <strong>{category.calculatedProgress}%</strong>
                    </td>
                    <td>
                      <strong>{category.calculatedWeight}</strong>
                    </td>
                    <td>{category.planned_start || "—"}</td>
                    <td>{category.planned_finish || "—"}</td>
                    <td>{category.status}</td>
                    <td>
                      <button type="button" onClick={() => saveBaseline(category)}>
                        Save
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="cw-delete-row"
                        onClick={() => deleteActivity(category)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  {category.children.map((activity) => {
                    const weeklyQty = toNumber(weeklyValues[activity.id] || 0);
                    const actual = toNumber(activity.actual_quantity);
                    const baseline = toNumber(activity.baseline_quantity);
                    const remaining = Math.max(0, baseline - actual - weeklyQty);
                    const rowProgress = progress(actual + weeklyQty, baseline);

                    return (
                      <tr key={activity.id}>
                        <td>
                          <input
                            value={activity.code}
                            onChange={(event) =>
                              updateBaseline(activity.id, "code", event.target.value)
                            }
                          />
                        </td>
                        <td className="cw-activity-name cw-child-name">
                          <input
                            value={activity.name}
                            onChange={(event) =>
                              updateBaseline(activity.id, "name", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={getActivityParent(activity, categories)}
                            onChange={(event) =>
                              updateBaseline(activity.id, "parent_id", event.target.value)
                            }
                          >
                            {categories.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.code} · {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={activity.discipline}
                            onChange={(event) =>
                              updateBaseline(activity.id, "discipline", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={activity.unit}
                            onChange={(event) =>
                              updateBaseline(activity.id, "unit", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={activity.baseline_quantity}
                            onChange={(event) =>
                              updateBaseline(activity.id, "baseline_quantity", event.target.value)
                            }
                          />
                        </td>
                        <td>{actual}</td>
                        <td>
                          <input
                            className="cw-weekly-input"
                            type="number"
                            value={weeklyValues[activity.id] || ""}
                            onChange={(event) =>
                              setWeeklyValues((current) => ({
                                ...current,
                                [activity.id]: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>{remaining}</td>
                        <td>
                          <div className="cw-progress-cell">
                            <span>{rowProgress}%</span>
                            <div>
                              <i style={{ width: `${rowProgress}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={activity.weight_percent}
                            onChange={(event) =>
                              updateBaseline(activity.id, "weight_percent", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={activity.planned_start || ""}
                            onChange={(event) =>
                              updateBaseline(activity.id, "planned_start", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={activity.planned_finish || ""}
                            onChange={(event) =>
                              updateBaseline(activity.id, "planned_finish", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={activity.status || "not_started"}
                            onChange={(event) =>
                              updateBaseline(activity.id, "status", event.target.value)
                            }
                          >
                            <option value="not_started">Not started</option>
                            <option value="in_progress">In progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td>
                          <button type="button" onClick={() => saveBaseline(activity)}>
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
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
