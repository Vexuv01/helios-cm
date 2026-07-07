import { useEffect, useMemo, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import { getConstructionSnapshot } from "../../services/constructionSnapshot.service";
import "../../styles/dashboard.css";

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function riskLabel(value) {
  if (value === "HIGH") return "High Risk";
  if (value === "MEDIUM") return "Watch";
  return "On Track";
}

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

  const controlRoom = useMemo(() => {
    if (!snapshot) return null;

    const progress = Number(snapshot.progress.overallProgress || 0);
    const earnedWeight = Number(snapshot.progress.earnedWeight || 0);
    const remainingWeight = Number(snapshot.forecast.remainingWeight || 100 - earnedWeight);

    return {
      progress,
      earnedWeight,
      remainingWeight: Math.max(0, remainingWeight),
      healthScore: Number(snapshot.health.score || 0),
      healthStatus: snapshot.health.status || "WATCH",
      delayRisk: snapshot.health.delayRisk || "LOW",
      forecastCOD: snapshot.forecast.forecastCOD,
      plannedCOD: snapshot.forecast.plannedCOD,
      varianceDays: Number(snapshot.forecast.varianceDays || 0),
      confidence: Number(snapshot.forecast.confidence || 0),
      weeklyVelocity: Number(snapshot.forecast.weeklyVelocity || 0),
      recoveryIndex: Number(snapshot.forecast.recoveryIndex || 0),
    };
  }, [snapshot]);

  if (loading) {
    return <p className="dashboard-empty">Loading Construction Control Room...</p>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  if (!snapshot || !controlRoom) {
    return <p className="dashboard-empty">No construction snapshot available.</p>;
  }

  return (
    <div className="dashboard-page">
      <header className="control-room-header">
        <div>
          <span className="eyebrow">HELIOS Construction Control Room</span>
          <h2>{currentProject?.name || snapshot.project?.name}</h2>
          <p>
            Single source of truth generated from Supabase, WBS baseline,
            weekly production and the Construction Intelligence Engine.
          </p>
        </div>

        <div className={`control-room-status ${controlRoom.delayRisk.toLowerCase()}`}>
          <span>{riskLabel(controlRoom.delayRisk)}</span>
          <strong>{controlRoom.healthStatus}</strong>
        </div>
      </header>

      <section className="control-room-hero">
        <div className="hero-progress">
          <span>Overall Construction Progress</span>
          <strong>{formatPercent(controlRoom.progress)}</strong>

          <div className="dashboard-progress-track xl">
            <div style={{ width: `${controlRoom.progress}%` }} />
          </div>

          <div className="hero-meta">
            <span>Earned Weight {formatPercent(controlRoom.earnedWeight)}</span>
            <span>Remaining {formatPercent(controlRoom.remainingWeight)}</span>
          </div>
        </div>

        <div className="hero-health">
          <span>Health Score</span>
          <strong>{controlRoom.healthScore}</strong>
          <small>Delay Risk: {controlRoom.delayRisk}</small>
        </div>

        <div className="hero-forecast">
          <span>Forecast COD</span>
          <strong>{formatDate(controlRoom.forecastCOD)}</strong>
          <small>Planned COD: {formatDate(controlRoom.plannedCOD)}</small>
        </div>
      </section>

      <section className="dashboard-kpi-grid">
        <article>
          <span>Weekly Updated Activities</span>
          <strong>
            {snapshot.weekly.activitiesUpdated}/{snapshot.weekly.totalActivities}
          </strong>
          <small>Activities with installed quantities</small>
        </article>

        <article>
          <span>Forecast Variance</span>
          <strong>{controlRoom.varianceDays}d</strong>
          <small>Current estimated schedule variance</small>
        </article>

        <article>
          <span>Weekly Velocity</span>
          <strong>{controlRoom.weeklyVelocity.toFixed(2)}%</strong>
          <small>Base productivity indicator</small>
        </article>

        <article>
          <span>Recovery Index</span>
          <strong>{controlRoom.recoveryIndex}</strong>
          <small>Ability to recover schedule risk</small>
        </article>
      </section>

      <section className="control-room-grid">
        <article className="dashboard-panel large">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Production</span>
              <h3>Discipline Progress</h3>
            </div>
          </div>

          {snapshot.disciplines.length === 0 ? (
            <p className="dashboard-empty">No WBS disciplines yet.</p>
          ) : (
            <div className="discipline-progress-list">
              {snapshot.disciplines.map((discipline) => (
                <div key={discipline.discipline} className="discipline-progress-row">
                  <div className="discipline-progress-title">
                    <strong>{discipline.discipline}</strong>
                    <span>{formatPercent(discipline.progress)}</span>
                  </div>

                  <div className="dashboard-progress-track small">
                    <div style={{ width: `${Number(discipline.progress || 0)}%` }} />
                  </div>

                  <small>
                    {discipline.activities} activities ·{" "}
                    {formatPercent(discipline.weightPercent)} weight ·{" "}
                    {formatPercent(discipline.remainingWeight)} remaining
                  </small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Today</span>
              <h3>Decision Feed</h3>
            </div>
          </div>

          <div className="decision-feed">
            {snapshot.decisionFeed.map((decision, index) => (
              <div
                key={`${decision.type}-${decision.title}-${index}`}
                className={`decision-item ${decision.severity.toLowerCase()}`}
              >
                <span>{decision.type}</span>
                <strong>{decision.title}</strong>
                <p>{decision.message}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Risk</span>
              <h3>Health Reasons</h3>
            </div>
          </div>

          <div className="health-reasons">
            {snapshot.health.reasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="health-reason">
                {reason}
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Execution</span>
              <h3>Critical Activities</h3>
            </div>
          </div>

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
                  <b>{formatPercent(activity.progress)}</b>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
