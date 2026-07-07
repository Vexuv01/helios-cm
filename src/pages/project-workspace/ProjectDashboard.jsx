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

function riskClass(value) {
  return String(value || "LOW").toLowerCase();
}

function activityLabel(activity) {
  return activity?.code ? `${activity.code} · ${activity.name}` : activity?.name;
}

function ActivityList({ items = [], empty, mode = "standard" }) {
  if (!items.length) {
    return <p className="dashboard-empty">{empty}</p>;
  }

  return (
    <div className="activity-list">
      {items.slice(0, 8).map((activity) => (
        <div key={activity.id} className={`activity-row ${mode}`}>
          <div>
            <strong>{activityLabel(activity)}</strong>
            <span>{activity.discipline || "General"}</span>
          </div>

          <div className="activity-meta">
            {activity.delayDays > 0 && <b>{activity.delayDays}d delay</b>}
            {activity.plannedStart && <small>Start {formatDate(activity.plannedStart)}</small>}
            {activity.plannedFinish && <small>Finish {formatDate(activity.plannedFinish)}</small>}
            <em>{formatPercent(activity.progress)}</em>
          </div>
        </div>
      ))}
    </div>
  );
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
    const timeline = snapshot.timeline || {};

    return {
      progress,
      earnedWeight,
      remainingWeight: Math.max(0, remainingWeight),
      healthScore: Number(snapshot.health.score || 0),
      healthStatus: snapshot.health.status || "WATCH",
      delayRisk: timeline.milestoneRisk || snapshot.health.delayRisk || "LOW",
      forecastCOD: timeline.forecastCOD || snapshot.forecast.forecastCOD,
      plannedCOD: snapshot.forecast.plannedCOD || timeline.plannedFinish,
      varianceDays: Number(snapshot.forecast.varianceDays || timeline.delayDays || 0),
      confidence: Number(snapshot.forecast.confidence || 0),
      weeklyVelocity: Number(snapshot.forecast.weeklyVelocity || 0),
      recoveryIndex: Number(snapshot.forecast.recoveryIndex || 0),
      timeline,
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
            Operational construction view generated from Supabase, WBS baseline,
            weekly production and the Construction Intelligence Engine.
          </p>
        </div>

        <div className={`control-room-status ${riskClass(controlRoom.delayRisk)}`}>
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
          <small>Milestone Risk: {controlRoom.delayRisk}</small>
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
          <span>Timeline Delay</span>
          <strong>{controlRoom.timeline.delayDays || 0}d</strong>
          <small>Calculated from planned finish vs actual status</small>
        </article>

        <article>
          <span>Upcoming Activities</span>
          <strong>{controlRoom.timeline.upcomingActivities?.length || 0}</strong>
          <small>Starting in the next 21 days</small>
        </article>

        <article>
          <span>Look Ahead</span>
          <strong>{controlRoom.timeline.lookAhead?.length || 0}</strong>
          <small>Activities due in the next 28 days</small>
        </article>
      </section>

      <section className="timeline-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Schedule Intelligence</span>
            <h3>Construction Timeline</h3>
          </div>
          <strong className={`timeline-risk ${riskClass(controlRoom.delayRisk)}`}>
            {controlRoom.delayRisk}
          </strong>
        </div>

        <div className="timeline-strip">
          <div>
            <span>Planned Start</span>
            <strong>{formatDate(controlRoom.timeline.plannedStart)}</strong>
          </div>
          <div>
            <span>Actual Start</span>
            <strong>{formatDate(controlRoom.timeline.actualStart)}</strong>
          </div>
          <div>
            <span>Today</span>
            <strong>{formatDate(controlRoom.timeline.today)}</strong>
          </div>
          <div>
            <span>Planned Finish</span>
            <strong>{formatDate(controlRoom.timeline.plannedFinish)}</strong>
          </div>
          <div>
            <span>Forecast COD</span>
            <strong>{formatDate(controlRoom.timeline.forecastCOD)}</strong>
          </div>
        </div>
      </section>

      <section className="control-room-grid">
        <article className="dashboard-panel danger">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Action Required</span>
              <h3>Overdue Activities</h3>
            </div>
          </div>

          <ActivityList
            items={controlRoom.timeline.overdueActivities}
            empty="No overdue activities detected."
            mode="overdue"
          />
        </article>

        <article className="dashboard-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Next 21 Days</span>
              <h3>Upcoming Activities</h3>
            </div>
          </div>

          <ActivityList
            items={controlRoom.timeline.upcomingActivities}
            empty="No upcoming activities in the next 21 days."
          />
        </article>

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
              <span className="eyebrow">Look Ahead</span>
              <h3>Next 28 Days</h3>
            </div>
          </div>

          <ActivityList
            items={controlRoom.timeline.lookAhead}
            empty="No activities due in the next 28 days."
          />
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
      </section>
    </div>
  );
}
