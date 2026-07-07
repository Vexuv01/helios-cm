import { useEffect, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import { loadProjectDashboard } from "../../features/dashboard/services/projectDashboardService";
import "../../styles/dashboard.css";

export default function ProjectDashboard() {
  const { currentProject, projectId } = useProject();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const data = await loadProjectDashboard(projectId);
        if (active) setDashboard(data);
      } catch (err) {
        if (active) setError(err.message || "Unable to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [projectId]);

  if (loading) {
    return <p className="dashboard-empty">Loading Construction Control Room...</p>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  const progress = Number(dashboard?.totals.progress || 0);
  const earnedWeight = Number(dashboard?.totals.earnedWeight || 0);
  const remainingWeight = Number(dashboard?.totals.remainingWeight || 0);

  return (
    <div className="dashboard-page">
      <header className="workspace-page-header">
        <h2>Construction Control Room</h2>
        <p>
          Real-time project overview for {currentProject?.name}, calculated from
          WBS baseline and installed quantities.
        </p>
      </header>

      <section className="dashboard-hero-card">
        <div>
          <span>Overall Progress</span>
          <strong>{progress.toFixed(1)}%</strong>
          <div className="dashboard-progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={`dashboard-health ${dashboard.health.status}`}>
          <span>Health Score</span>
          <strong>{dashboard.health.score}</strong>
          <small>{dashboard.health.status}</small>
        </div>
      </section>

      <section className="dashboard-kpi-grid">
        <article>
          <span>Activities</span>
          <strong>{dashboard.activities.length}</strong>
          <small>WBS records</small>
        </article>
        <article>
          <span>Weight Earned</span>
          <strong>{earnedWeight.toFixed(1)}%</strong>
          <small>Weighted production</small>
        </article>
        <article>
          <span>Weight Remaining</span>
          <strong>{remainingWeight.toFixed(1)}%</strong>
          <small>To complete</small>
        </article>
        <article>
          <span>Critical Activities</span>
          <strong>{dashboard.criticalActivities.length}</strong>
          <small>Progress below threshold</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <h3>Discipline Progress</h3>

          {dashboard.disciplines.length === 0 ? (
            <p className="dashboard-empty">No WBS disciplines yet.</p>
          ) : (
            <div className="discipline-progress-list">
              {dashboard.disciplines.map((discipline) => (
                <div key={discipline.discipline} className="discipline-progress-row">
                  <div className="discipline-progress-title">
                    <strong>{discipline.discipline}</strong>
                    <span>{Number(discipline.progress || 0).toFixed(1)}%</span>
                  </div>
                  <div className="dashboard-progress-track small">
                    <div
                      style={{
                        width: `${Number(discipline.progress || 0)}%`,
                      }}
                    />
                  </div>
                  <small>
                    {discipline.activities} activities ·{" "}
                    {Number(discipline.weightPercent || 0).toFixed(1)}% weight
                  </small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel">
          <h3>Critical Activities</h3>

          {dashboard.criticalActivities.length === 0 ? (
            <p className="dashboard-empty">
              No critical activities detected by the Construction Engine.
            </p>
          ) : (
            <div className="critical-list">
              {dashboard.criticalActivities.map((activity) => (
                <div key={activity.id} className="critical-row">
                  <div>
                    <strong>{activity.code}</strong>
                    <span>{activity.name}</span>
                  </div>
                  <b>{Number(activity.progress || 0).toFixed(1)}%</b>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
