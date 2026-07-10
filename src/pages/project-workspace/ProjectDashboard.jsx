import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import { loadRealConstructionDashboard } from "../../services/constructionEngine.service";
import "../../styles/dashboard.css";

const COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function stateLabel(gap) {
  if (Number(gap || 0) >= 0) return "ON / AHEAD";
  return "BEHIND PLAN";
}

function varianceClass(value) {
  const gap = Number(value || 0);
  if (gap >= 0) return "variance-good";
  if (gap >= -20) return "variance-warning";
  return "variance-danger";
}

function CardHead({ eyebrow, title, action }) {
  return (
    <div className="dashboard-card-head">
      <div>
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>
      {action ? <b>{action}</b> : null}
    </div>
  );
}

function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={{
        background: "#020617",
        border: "1px solid rgba(148,163,184,.25)",
        borderRadius: 14,
      }}
    />
  );
}

export default function ProjectDashboard() {
  const params = useParams();
  const navigate = useNavigate();
  const initialProjectId = params.projectId || params.id || "";

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId]
  );

  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("code", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = data || [];
    setProjects(rows);

    if (!projectId && rows[0]?.id) {
      setProjectId(rows[0].id);
    }
  }, [projectId]);

  const loadDashboard = useCallback(async (targetProjectId) => {
    if (!targetProjectId) return;

    setLoading(true);

    try {
      const result = await loadRealConstructionDashboard(targetProjectId);
      setDashboard(result);
    } catch (error) {
      console.error(error);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [loadProjects]);

  useEffect(() => {
    if (projectId) {
      loadDashboard(projectId);
    }
  }, [loadDashboard, projectId]);

  function handleProjectChange(event) {
    const nextProjectId = event.target.value;
    setProjectId(nextProjectId);
    navigate(`/projects/${nextProjectId}/dashboard`);
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-empty">Loading Control Room...</div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-hero">
        <div>
          <span>HELIOS CM Enterprise</span>
          <h1>{selectedProject ? `${selectedProject.code} · ${selectedProject.name}` : "Construction Control Room"}</h1>
          <p>Executive view da WBS baseline, Weekly actual production e Construction Engine.</p>
        </div>

        <div className="dashboard-actions">
          <select value={projectId} onChange={handleProjectChange}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => loadDashboard(projectId)}>
            Refresh
          </button>

          <Link to={`/projects/${projectId}/wbs`}>WBS</Link>
          <Link to={`/projects/${projectId}/weekly`}>Weekly</Link>
        </div>
      </header>

      {!dashboard ? (
        <section className="dashboard-empty">Nessun dato disponibile.</section>
      ) : (
        <>
          <section className="executive-strip">
            <article className="executive-main-card">
              <span>Actual Progress</span>
              <strong>{pct(dashboard.totalProgress)}</strong>
              <div className="progress-track">
                <div style={{ width: `${Math.min(Math.max(Number(dashboard.totalProgress || 0), 0), 100)}%` }} />
              </div>
              <small>Planned {pct(dashboard.plannedProgress)}</small>
            </article>

            <article className={`executive-metric ${varianceClass(dashboard.scheduleGap)}`}>
              <span>Variance</span>
              <strong>{pct(dashboard.scheduleGap)}</strong>
              <small>{stateLabel(dashboard.scheduleGap)}</small>
            </article>

            <article className="executive-metric">
              <span>Critical</span>
              <strong>{dashboard.criticalActivities.length}</strong>
              <small>Activities behind plan</small>
            </article>

            <article className="executive-metric">
              <span>Weekly</span>
              <strong>{dashboard.weeklyReports}</strong>
              <small>{dashboard.weeklyEntries} entries</small>
            </article>
          </section>

          <section className="dashboard-grid decision-grid">
            <div className="dashboard-card">
              <CardHead eyebrow="Today" title="Decision Feed" />
              <div className="decision-list">
                {dashboard.decisionFeed.map((item, index) => (
                  <article key={`${item.title}-${index}`}>
                    <span>{item.type}</span>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <CardHead eyebrow="Action Required" title="Critical Activities" />
              <div className="decision-list">
                {dashboard.criticalActivities.length === 0 ? (
                  <p>Nessuna attività critica rilevata.</p>
                ) : (
                  dashboard.criticalActivities.slice(0, 6).map((activity) => (
                    <article key={activity.id}>
                      <span>{activity.discipline}</span>
                      <strong>
                        {activity.code} · {activity.name}
                      </strong>
                      <p>
                        Actual {pct(activity.actualProgress)} vs Planned {pct(activity.plannedProgress)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <CardHead
              eyebrow="S-Curve"
              title="Planned WBS vs Weekly Actual"
              action={stateLabel(dashboard.scheduleGap)}
            />

            <div className="chart-box xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.curve}>
                  <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                  <XAxis dataKey="week" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} />
                  <ChartTooltip />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    name="Planned"
                    stroke="#38bdf8"
                    fill="#38bdf833"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual"
                    stroke="#22c55e"
                    fill="#22c55e33"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dashboard-grid analytics-grid">
            <div className="dashboard-card">
              <CardHead eyebrow="Discipline" title="Actual Progress" />
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.disciplines} layout="vertical">
                    <CartesianGrid stroke="rgba(148,163,184,.12)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                    <YAxis type="category" dataKey="discipline" stroke="#94a3b8" width={105} />
                    <ChartTooltip />
                    <Bar dataKey="progress" name="Actual %" radius={[0, 10, 10, 0]}>
                      {dashboard.disciplines.map((entry, index) => (
                        <Cell key={entry.discipline} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-card">
              <CardHead eyebrow="Weight" title="Distribution" />
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard.weightDistribution}
                      dataKey="value"
                      nameKey="discipline"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={5}
                    >
                      {dashboard.weightDistribution.map((entry, index) => (
                        <Cell key={entry.discipline} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="dashboard-card technical-card">
            <CardHead eyebrow="Data Source" title="Engine Inputs" />
            <div className="data-source-grid">
              <div>
                <span>Actual Source</span>
                <strong>{dashboard.dataSource.actualSource}</strong>
                <small>{dashboard.dataSource.weeklyReports} reports · {dashboard.dataSource.weeklyEntries} entries</small>
              </div>
              <div>
                <span>Planned Source</span>
                <strong>{dashboard.dataSource.schedulableActivities}/{dashboard.dataSource.wbsActivities}</strong>
                <small>Schedulable activities</small>
              </div>
              <div>
                <span>Started by Today</span>
                <strong>{dashboard.dataSource.activitiesStartedByToday}</strong>
                <small>Start {dashboard.dataSource.activitiesWithStart} · Finish {dashboard.dataSource.activitiesWithFinish}</small>
              </div>
              <div>
                <span>Total Weight</span>
                <strong>{dashboard.dataSource.totalWeight}%</strong>
                <small>WBS total weight</small>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
