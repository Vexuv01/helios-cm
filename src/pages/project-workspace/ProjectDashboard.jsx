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

export default function ProjectDashboard() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId]
  );

  const loadDashboard = useCallback(async () => {
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
      setDashboard(null);
      setLoading(false);
      return;
    }

    try {
      const result = await loadRealConstructionDashboard(nextProjectId);
      setDashboard(result);
    } catch (error) {
      console.error(error);
      setDashboard(null);
    }

    setLoading(false);
  }, [projectId, routeProjectId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
          <p>Vista decisionale da WBS programmata vs produzione Weekly reale.</p>
        </div>

        <div className="dashboard-actions">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </select>

          <button type="button" onClick={loadDashboard}>
            Refresh Dashboard
          </button>

          <Link to={`/projects/${projectId}/wbs`}>Manage Construction</Link>
        </div>
      </header>

      {!dashboard ? (
        <section className="dashboard-empty">
          Nessun dato disponibile. Apri Manage Construction e salva una Weekly.
        </section>
      ) : (
        <>
          <section className="control-kpis">
            <div className="hero-kpi">
              <span>Total Progress</span>
              <strong>{dashboard.totalProgress}%</strong>
              <small>Weighted WBS progress</small>
            </div>
            <div className="hero-kpi health">
              <span>Health Score</span>
              <strong>{dashboard.healthScore}</strong>
              <small>
                {dashboard.scheduleGap >= 0
                  ? `Ahead +${dashboard.scheduleGap}%`
                  : `Behind ${dashboard.scheduleGap}%`}
              </small>
            </div>
            <div className="hero-kpi">
              <span>Critical Activities</span>
              <strong>{dashboard.criticalActivities.length}</strong>
              <small>Highest impact open WBS</small>
            </div>
            <div className="hero-kpi">
              <span>Blocked</span>
              <strong>{dashboard.blocked}</strong>
              <small>Operational blockers</small>
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
                    <defs>
                      <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      fill="url(#plannedGradient)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke="#22c55e"
                      fill="url(#actualGradient)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-card chart-card">
              <div className="dashboard-card-head">
                <div>
                  <span>Health</span>
                  <strong>Score drivers</strong>
                </div>
              </div>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard.healthBreakdown}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={5}
                    >
                      {dashboard.healthBreakdown.map((entry, index) => (
                        <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
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
                  <strong>Progress by WBS area</strong>
                </div>
              </div>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.disciplines} layout="vertical">
                    <CartesianGrid stroke="rgba(148,163,184,.12)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="discipline"
                      stroke="#94a3b8"
                      width={95}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,.25)",
                        borderRadius: 14,
                      }}
                    />
                    <Bar dataKey="progress" name="Progress %" radius={[0, 8, 8, 0]}>
                      {dashboard.disciplines.map((entry, index) => (
                        <Cell key={entry.discipline} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-card chart-card">
              <div className="dashboard-card-head">
                <div>
                  <span>Weekly</span>
                  <strong>Production by discipline</strong>
                </div>
              </div>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.weeklyProduction}>
                    <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
                    <XAxis dataKey="discipline" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,.25)",
                        borderRadius: 14,
                      }}
                    />
                    <Bar dataKey="quantity" name="Weekly Qty" radius={[8, 8, 0, 0]}>
                      {dashboard.weeklyProduction.map((entry, index) => (
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
                  <span>Decision Feed</span>
                  <strong>What needs attention</strong>
                </div>
              </div>

              <div className="decision-feed">
                {dashboard.scheduleGap < 0 ? (
                  <div className="decision danger">
                    Planned vs actual gap: {dashboard.scheduleGap}%. Recovery plan required.
                  </div>
                ) : (
                  <div className="decision good">
                    Actual production is aligned with or ahead of planned WBS.
                  </div>
                )}

                {dashboard.criticalActivities.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="decision">
                    {activity.code} · {activity.name}: {activity.progress}% complete,{" "}
                    {activity.remaining_quantity} {activity.unit} remaining.
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card-head">
              <div>
                <span>Critical WBS</span>
                <strong>Highest impact open activities</strong>
              </div>
            </div>

            <div className="critical-list">
              {dashboard.criticalActivities.map((activity) => (
                <div key={activity.id} className="critical-row">
                  <div>
                    <strong>
                      {activity.code} · {activity.name}
                    </strong>
                    <span>
                      {activity.discipline} · {activity.actual_quantity}/{activity.baseline_quantity}{" "}
                      {activity.unit} · remaining {activity.remaining_quantity}
                    </span>
                  </div>
                  <b>{activity.progress}%</b>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
