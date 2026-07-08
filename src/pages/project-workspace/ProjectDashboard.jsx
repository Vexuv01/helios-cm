import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { loadRealConstructionDashboard } from "../../services/constructionEngine.service";
import "../../styles/dashboard.css";

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
        <div className="dashboard-empty">Loading real construction dashboard...</div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-hero">
        <div>
          <span>HELIOS CM Enterprise</span>
          <h1>Real Construction Dashboard</h1>
          <p>Dashboard calcolata da WBS baseline + Weekly actual production.</p>
        </div>

        <div className="dashboard-actions">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </select>

          <Link to={`/projects/${projectId}/construction`}>Open WBS Grid</Link>
        </div>
      </header>

      {!dashboard ? (
        <section className="dashboard-empty">
          Nessun dato disponibile. Apri la WBS Grid e salva una Weekly.
        </section>
      ) : (
        <>
          <section className="dashboard-kpis">
            <div>
              <span>Project</span>
              <strong>
                {selectedProject?.code} · {selectedProject?.name}
              </strong>
            </div>
            <div>
              <span>Total Progress</span>
              <strong>{dashboard.totalProgress}%</strong>
            </div>
            <div>
              <span>Health Score</span>
              <strong>{dashboard.healthScore}</strong>
            </div>
            <div>
              <span>Activities</span>
              <strong>{dashboard.totalActivities}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{dashboard.completed}</strong>
            </div>
            <div>
              <span>Blocked</span>
              <strong>{dashboard.blocked}</strong>
            </div>
          </section>

          <section className="dashboard-grid-two">
            <div className="dashboard-card">
              <div className="dashboard-card-head">
                <span>Progress by discipline</span>
                <strong>Automatic calculation</strong>
              </div>

              <div className="discipline-list">
                {dashboard.disciplines.map((item) => (
                  <div key={item.discipline} className="discipline-row">
                    <div>
                      <strong>{item.discipline}</strong>
                      <span>
                        {item.completed}/{item.activities} completed
                      </span>
                    </div>
                    <div className="discipline-progress">
                      <span>{item.progress}%</span>
                      <div>
                        <i style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-head">
                <span>Critical activities</span>
                <strong>Highest weight open items</strong>
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
                        {activity.unit}
                      </span>
                    </div>
                    <b>{activity.progress}%</b>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
