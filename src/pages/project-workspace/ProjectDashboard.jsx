import { useEffect, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import { getConstructionSnapshot } from "../../services/constructionSnapshot.service";
import "../../styles/dashboard.css";

export default function ProjectDashboard() {
  const { currentProject, projectId } = useProject();

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSnapshot() {
      if (!projectId) return;

      setLoading(true);
      setError("");

      try {
        const data = await getConstructionSnapshot(projectId);
        if (active) setSnapshot(data);
      } catch (err) {
        if (active) setError(err.message || "Unable to load construction snapshot");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSnapshot();

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

  if (!snapshot) {
    return <p className="dashboard-empty">No construction snapshot available.</p>;
  }

  const progress = Number(snapshot.progress.overallProgress || 0);
  const earnedWeight = Number(snapshot.progress.earnedWeight || 0);
  const remainingWeight = Math.max(0, 100 - earnedWeight);

  return (
    <div className="dashboard-page">
      <header className="workspace-page-header">
        <h2>Construction Control Room</h2>
        <p>
          Real-time project overview for {currentProject?.name}, generated from
          the Construction Snapshot Engine.
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

        <div className={`dashboard-health ${snapshot.health.delayRisk.toLowerCase()}`}>
          <span>Health Score</span>
          <strong>{snapshot.health.score}</strong>
          <small>Delay Risk: {snapshot.health.delayRisk}</small>
        </div>
      </section>

      <section className="dashboard-kpi-grid">
        <article>
          <span>Weekly Updated Activities</span>
          <strong>{snapshot.weekly.activitiesUpdated}</strong>
          <small>From latest weekly production</small>
        </article>

        <article>
          <span>Weight Earned</span>
          <strong>{earnedWeight.toFixed(1)}%</strong>
          <small>Weighted construction progress</small>
        </article>

        <article>
          <span>Weight Remaining</span>
          <strong>{remainingWeight.toFixed(1)}%</strong>
          <small>To complete</small>
        </article>

        <article>
          <span>Critical Activities</span>
          <strong>{snapshot.criticalActivities.length}</strong>
          <small>Detected by Construction Engine</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <h3>Discipline Progress</h3>

          {snapshot.disciplines.length === 0 ? (
            <p className="dashboard-empty">No WBS disciplines yet.</p>
          ) : (
            <div className="discipline-progress-list">
              {snapshot.disciplines.map((discipline) => (
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

          {snapshot.criticalActivities.length === 0 ? (
            <p className="dashboard-empty">
              No critical activities detected by the Construction Engine.
            </p>
          ) : (
            <div className="critical-list">
              {snapshot.criticalActivities.map((activity) => (
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
