import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export default function ProjectDashboard() {
  const params = useParams();
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
    setProjectId(event.target.value);
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
      <header className="dashboard-hero cinematic">
        <div>
          <span>HELIOS CM Enterprise</span>
          <h1>Construction Control Room</h1>
          <p>
            Vista decisionale da Baseline WBS programmata vs produzione Weekly reale.
          </p>
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
            Refresh Dashboard
          </button>

          <Link to={`/projects/${projectId}/wbs`}>Manage Construction</Link>
        </div>
      </header>

      {selectedProject && (
        <section className="control-kpis">
          <div className="hero-kpi">
            <span>Project</span>
            <strong>{selectedProject.code}</strong>
            <small>{selectedProject.name}</small>
          </div>

          {dashboard?.project?.location && (
            <div className="hero-kpi">
              <span>Location</span>
              <strong>{dashboard.project.location}</strong>
              <small>From Supabase project data</small>
            </div>
          )}

          {dashboard?.project?.status && (
            <div className="hero-kpi">
              <span>Status</span>
              <strong>{dashboard.project.status}</strong>
              <small>From Supabase project status</small>
            </div>
          )}

          <div className="hero-kpi">
            <span>Weekly Reports</span>
            <strong>{dashboard?.weeklyReports || 0}</strong>
            <small>Submitted / validated / approved</small>
          </div>
        </section>
      )}

      {!dashboard ? (
        <section className="dashboard-empty">Nessun dato disponibile.</section>
      ) : (
        <>
          <section className="control-kpis">
            <div className="hero-kpi">
              <span>Actual Progress</span>
              <strong>{pct(dashboard.totalProgress)}</strong>
              <small>Solo da Weekly reali</small>
            </div>

            <div className="hero-kpi">
              <span>Planned Progress</span>
              <strong>{pct(dashboard.plannedProgress)}</strong>
              <small>Da date e pesi della Baseline</small>
            </div>

            <div className="hero-kpi health">
              <span>Schedule Variance</span>
              <strong>{pct(dashboard.scheduleGap)}</strong>
              <small>{dashboard.scheduleGap >= 0 ? "Ahead / aligned" : "Behind plan"}</small>
            </div>

            <div className="hero-kpi">
              <span>Health Score</span>
              <strong>{dashboard.healthScore}</strong>
              <small>Calculated, not manual</small>
            </div>

            <div className="hero-kpi">
              <span>Critical Activities</span>
              <strong>{dashboard.criticalActivities.length}</strong>
              <small>Actual behind planned</small>
            </div>
          </section>

          <section className="chart-grid-main">
            <div className="dashboard-card chart-card wide">
              <div className="dashboard-card-head">
                <div>
                  <span>S-Curve</span>
                  <strong>Planned WBS vs Weekly Actual</strong>
                </div>
                <b>{dashboard.scheduleGap >= 0 ? "ON / AHEAD" : "BEHIND PLAN"}</b>
              </div>

              <div className="chart-box large">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.curve}>
                    <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                    <XAxis dataKey="week" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,.25)",
                        borderRadius: 14,
                      }}
                    />
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
            </div>

            <div className="dashboard-card chart-card">
              <div className="dashboard-card-head">
                <div>
                  <span>Weight</span>
                  <strong>Distribution</strong>
                </div>
              </div>

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
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,.25)",
                        borderRadius: 14,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="chart-grid-three">
            <div className="dashboard-card chart-card">
              <div className="dashboard-card-head">
                <div>
                  <span>Discipline</span>
                  <strong>Actual Progress</strong>
                </div>
              </div>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.disciplines} layout="vertical">
                    <CartesianGrid stroke="rgba(148,163,184,.12)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                    <YAxis type="category" dataKey="discipline" stroke="#94a3b8" width={105} />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,.25)",
                        borderRadius: 14,
                      }}
                    />
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
              <div className="dashboard-card-head">
                <div>
                  <span>Action Required</span>
                  <strong>Critical Activities</strong>
                </div>
              </div>

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
                        Actual {pct(activity.actualProgress)} vs Planned{" "}
                        {pct(activity.plannedProgress)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-head">
                <div>
                  <span>Today</span>
                  <strong>Decision Feed</strong>
                </div>
              </div>

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
          </section>
        </>
      )}
    </main>
  );
}
