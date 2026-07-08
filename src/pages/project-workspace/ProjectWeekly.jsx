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

function isCategory(activity, allActivities) {
  return allActivities.some((item) => item.parent_id === activity.id) || !activity.code.includes(".");
}

export default function ProjectWeekly() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;
  const week = useMemo(() => getWeekRange(), []);

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");
  const [activities, setActivities] = useState([]);
  const [weeklyValues, setWeeklyValues] = useState({});
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const operationalActivities = useMemo(
    () => activities.filter((activity) => !isCategory(activity, activities)),
    [activities]
  );

  const disciplines = useMemo(
    () => [...new Set(operationalActivities.map((activity) => activity.discipline).filter(Boolean))],
    [operationalActivities]
  );

  const visibleActivities = useMemo(() => {
    return operationalActivities.filter((activity) => {
      const matchSearch =
        !search ||
        activity.code.toLowerCase().includes(search.toLowerCase()) ||
        activity.name.toLowerCase().includes(search.toLowerCase());

      const matchDiscipline = discipline === "all" || activity.discipline === discipline;

      return matchSearch && matchDiscipline;
    });
  }, [discipline, operationalActivities, search]);

  const weeklyTotal = useMemo(
    () => Object.values(weeklyValues).reduce((sum, value) => sum + toNumber(value), 0),
    [weeklyValues]
  );

  const loadWeekly = useCallback(async () => {
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
    setWeeklyValues({});
    setLoading(false);
  }, [projectId, routeProjectId]);

  useEffect(() => {
    loadWeekly();
  }, [loadWeekly]);

  async function saveWeekly() {
    const rows = Object.entries(weeklyValues)
      .filter(([, value]) => toNumber(value) !== 0)
      .map(([activityId, value]) => ({
        activity_id: activityId,
        actual_quantity: toNumber(value),
      }));

    if (!rows.length) {
      alert("Inserisci almeno una quantità prodotta.");
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

    const { error } = await supabase
      .from("weekly_entries")
      .upsert(payload, { onConflict: "weekly_report_id,wbs_activity_id" });

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    setSaving(false);
    await loadWeekly();
  }

  return (
    <main className="construction-workspace">
      <header className="cw-workspace-header">
        <div>
          <span>EPC Production Area</span>
          <h1>Weekly Production</h1>
          <p>Inserimento produzione settimanale per attività WBS. Nessuna modifica baseline.</p>
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
          <span>Week</span>
          <strong>{week.weekStart} / {week.weekEnd}</strong>
        </div>
        <div>
          <span>Activities</span>
          <strong>{operationalActivities.length}</strong>
        </div>
        <div>
          <span>This Weekly</span>
          <strong>{weeklyTotal}</strong>
        </div>
        <div>
          <span>Visible Rows</span>
          <strong>{visibleActivities.length}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>Draft</strong>
        </div>
      </section>

      <section className="cw-toolbar weekly-toolbar">
        <input
          placeholder="Search production activity..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={discipline} onChange={(event) => setDiscipline(event.target.value)}>
          <option value="all">All disciplines</option>
          {disciplines.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <button type="button" onClick={saveWeekly} disabled={saving}>
          {saving ? "Saving..." : "Save Weekly Production"}
        </button>
      </section>

      <section className="cw-grid-shell">
        {loading ? (
          <div className="cw-empty">Loading Weekly...</div>
        ) : (
          <table className="cw-grid cw-weekly-grid">
            <thead>
              <tr>
                <th>Code</th>
                <th>Activity</th>
                <th>Discipline</th>
                <th>U.M.</th>
                <th>Baseline</th>
                <th>Weekly Qty</th>
              </tr>
            </thead>

            <tbody>
              {visibleActivities.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.code}</td>
                  <td className="cw-activity-readonly">{activity.name}</td>
                  <td>{activity.discipline}</td>
                  <td>{activity.unit}</td>
                  <td>{activity.baseline_quantity}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
