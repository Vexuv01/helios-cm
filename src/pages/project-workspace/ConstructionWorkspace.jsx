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

  const week = useMemo(() => getWeekRange(), []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId]
  );

  const visibleActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchSearch =
        activity.code.toLowerCase().includes(search.toLowerCase()) ||
        activity.name.toLowerCase().includes(search.toLowerCase());

      const matchDiscipline = discipline === "all" || activity.discipline === discipline;
      const matchStatus = status === "all" || activity.status === status;

      return matchSearch && matchDiscipline && matchStatus;
    });
  }, [activities, discipline, search, status]);

  const disciplines = useMemo(
    () => [...new Set(activities.map((activity) => activity.discipline).filter(Boolean))],
    [activities]
  );

  const metrics = useMemo(() => {
    const totalWeight = activities.reduce(
      (sum, activity) => sum + toNumber(activity.weight_percent),
      0
    );

    const weightedProgress = activities.reduce((sum, activity) => {
      const activityProgress = progress(activity.actual_quantity, activity.baseline_quantity);
      return sum + activityProgress * toNumber(activity.weight_percent);
    }, 0);

    const totalProgress = totalWeight ? Math.round(weightedProgress / totalWeight) : 0;
    const weeklyTotal = Object.values(weeklyValues).reduce((sum, value) => sum + toNumber(value), 0);

    return {
      totalProgress,
      totalActivities: activities.length,
      weeklyTotal,
      completed: activities.filter((activity) => activity.status === "completed").length,
      delayed: activities.filter((activity) => activity.status === "blocked").length,
    };
  }, [activities, weeklyValues]);

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
      .select("activity_id, actual_quantity, weekly_reports!inner(project_id)")
      .eq("weekly_reports.project_id", nextProjectId);

    if (entriesError) {
      console.error(entriesError);
    }

    const actualByActivity = {};
    for (const entry of entryRows || []) {
      actualByActivity[entry.activity_id] =
        toNumber(actualByActivity[entry.activity_id]) + toNumber(entry.actual_quantity);
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

  function updateBaseline(activityId, field, value) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === activityId ? { ...activity, [field]: value } : activity
      )
    );
  }

  async function saveBaseline(activity) {
    const { error } = await supabase
      .from("wbs_activities")
      .update({
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
      actual_quantity: row.actual_quantity,
    }));

    const { error: entriesError } = await supabase
      .from("weekly_entries")
      .upsert(payload, { onConflict: "weekly_report_id,activity_id" });

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
          <p>
            WBS reale, quantità weekly, avanzamento automatico e salvataggio Supabase.
          </p>
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

      <section className="cw-toolbar">
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

        <button type="button" onClick={saveWeekly} disabled={saving}>
          {saving ? "Saving..." : `Save Weekly ${week.weekStart}`}
        </button>
      </section>

      <section className="cw-grid-shell">
        {loading ? (
          <div className="cw-empty">Loading real WBS...</div>
        ) : (
          <table className="cw-grid">
            <thead>
              <tr>
                <th>Code</th>
                <th>Activity</th>
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
              </tr>
            </thead>

            <tbody>
              {visibleActivities.map((activity) => {
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
                        onChange={(event) => updateBaseline(activity.id, "code", event.target.value)}
                      />
                    </td>
                    <td className="cw-activity-name">
                      <input
                        value={activity.name}
                        onChange={(event) => updateBaseline(activity.id, "name", event.target.value)}
                      />
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
                        onChange={(event) => updateBaseline(activity.id, "unit", event.target.value)}
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
