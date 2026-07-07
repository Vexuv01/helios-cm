function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function riskClass(value) {
  return String(value || "LOW").toLowerCase();
}

function riskLabel(value) {
  if (value === "HIGH") return "High Risk";
  if (value === "MEDIUM") return "Watch";
  return "On Track";
}

function getActivityTitle(activity) {
  return activity?.code ? `${activity.code} · ${activity.name}` : activity?.name || "Unnamed activity";
}

function ActivityCard({ activity, variant = "default" }) {
  return (
    <article className={`cr-activity-card ${variant}`}>
      <header className="cr-activity-card-head">
        <div>
          <h4>{getActivityTitle(activity)}</h4>
          <p>{activity.discipline || "General"}</p>
        </div>

        <strong>
          {variant === "overdue" ? `${activity.delayDays || 0}d` : formatPercent(activity.progress)}
        </strong>
      </header>

      <div className="cr-activity-meta">
        <div>
          <span>Start</span>
          <b>{formatDate(activity.plannedStart)}</b>
        </div>

        <div>
          <span>Finish</span>
          <b>{formatDate(activity.plannedFinish)}</b>
        </div>

        <div>
          <span>{variant === "overdue" ? "Delay" : "Progress"}</span>
          <b>{variant === "overdue" ? `${activity.delayDays || 0} days` : formatPercent(activity.progress)}</b>
        </div>
      </div>

      <div className="cr-mini-track">
        <i style={{ width: `${Number(activity.progress || 0)}%` }} />
      </div>
    </article>
  );
}

function ActivityPanel({ eyebrow, title, items = [], empty, variant = "default" }) {
  return (
    <section className={`cr-panel ${variant === "overdue" ? "danger" : ""}`}>
      <div className="cr-panel-title">
        <span>{eyebrow}</span>
        <h3>{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className="cr-empty">{empty}</p>
      ) : (
        <div className="cr-activity-list">
          {items.slice(0, 5).map((activity) => (
            <ActivityCard key={activity.id} activity={activity} variant={variant} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProjectControlRoom({ snapshot, projectName }) {
  const timeline = snapshot.timeline || {};
  const progress = Number(snapshot.progress?.overallProgress || 0);
  const earnedWeight = Number(snapshot.progress?.earnedWeight || 0);
  const remainingWeight = Number(snapshot.forecast?.remainingWeight || 100 - earnedWeight);
  const risk = timeline.milestoneRisk || snapshot.health?.delayRisk || "LOW";

  return (
    <div className="cr-page">
      <header className="cr-header">
        <div>
          <span>HELIOS Construction Control Room</span>
          <h1>{projectName || snapshot.project?.name}</h1>
          <p>Vista operativa generata da Supabase, WBS baseline, Weekly production e Construction Intelligence Engine.</p>
        </div>

        <aside className={`cr-status ${riskClass(risk)}`}>
          <span>{riskLabel(risk)}</span>
          <strong>{snapshot.health?.status || "WATCH"}</strong>
        </aside>
      </header>

      <section className="cr-hero">
        <article className="cr-progress-main">
          <span>Overall Construction Progress</span>
          <strong>{formatPercent(progress)}</strong>
          <div className="cr-track">
            <i style={{ width: `${progress}%` }} />
          </div>
          <footer>
            <b>Earned {formatPercent(earnedWeight)}</b>
            <b>Remaining {formatPercent(Math.max(0, remainingWeight))}</b>
          </footer>
        </article>

        <article>
          <span>Health Score</span>
          <strong>{snapshot.health?.score || 0}</strong>
          <small>Milestone Risk: {risk}</small>
        </article>

        <article>
          <span>Forecast COD</span>
          <strong>{formatDate(timeline.forecastCOD || snapshot.forecast?.forecastCOD)}</strong>
          <small>Planned COD: {formatDate(snapshot.forecast?.plannedCOD || timeline.plannedFinish)}</small>
        </article>
      </section>

      <section className="cr-kpis">
        <article>
          <span>Weekly Updated</span>
          <strong>{snapshot.weekly?.activitiesUpdated || 0}/{snapshot.weekly?.totalActivities || 0}</strong>
        </article>

        <article>
          <span>Timeline Delay</span>
          <strong>{timeline.delayDays || 0}d</strong>
        </article>

        <article>
          <span>Upcoming</span>
          <strong>{timeline.upcomingActivities?.length || 0}</strong>
        </article>

        <article>
          <span>Look Ahead</span>
          <strong>{timeline.lookAhead?.length || 0}</strong>
        </article>
      </section>

      <section className="cr-timeline">
        <div className="cr-panel-title">
          <span>Schedule Intelligence</span>
          <h3>Construction Timeline</h3>
        </div>

        <div className="cr-timeline-grid">
          <div><span>Planned Start</span><strong>{formatDate(timeline.plannedStart)}</strong></div>
          <div><span>Actual Start</span><strong>{formatDate(timeline.actualStart)}</strong></div>
          <div><span>Today</span><strong>{formatDate(timeline.today)}</strong></div>
          <div><span>Planned Finish</span><strong>{formatDate(timeline.plannedFinish)}</strong></div>
          <div><span>Forecast COD</span><strong>{formatDate(timeline.forecastCOD)}</strong></div>
        </div>
      </section>

      <main className="cr-grid">
        <ActivityPanel
          eyebrow="Action Required"
          title="Overdue Activities"
          items={timeline.overdueActivities}
          empty="No overdue activities detected."
          variant="overdue"
        />

        <ActivityPanel
          eyebrow="Next 21 Days"
          title="Upcoming Activities"
          items={timeline.upcomingActivities}
          empty="No upcoming activities in the next 21 days."
        />

        <section className="cr-panel cr-wide">
          <div className="cr-panel-title">
            <span>Production</span>
            <h3>Discipline Progress</h3>
          </div>

          <div className="cr-discipline-list">
            {(snapshot.disciplines || []).map((discipline) => (
              <article key={discipline.discipline} className="cr-discipline">
                <header>
                  <strong>{discipline.discipline}</strong>
                  <b>{formatPercent(discipline.progress)}</b>
                </header>
                <div className="cr-mini-track">
                  <i style={{ width: `${Number(discipline.progress || 0)}%` }} />
                </div>
                <small>
                  {discipline.activities} activities · {formatPercent(discipline.weightPercent)} weight · {formatPercent(discipline.remainingWeight)} remaining
                </small>
              </article>
            ))}
          </div>
        </section>

        <ActivityPanel
          eyebrow="Look Ahead"
          title="Next 28 Days"
          items={timeline.lookAhead}
          empty="No activities due in the next 28 days."
        />

        <section className="cr-panel">
          <div className="cr-panel-title">
            <span>Today</span>
            <h3>Decision Feed</h3>
          </div>

          <div className="cr-decision-feed">
            {(snapshot.decisionFeed || []).map((decision, index) => (
              <article key={`${decision.title}-${index}`} className={`cr-decision ${riskClass(decision.severity)}`}>
                <span>{decision.type}</span>
                <strong>{decision.title}</strong>
                <p>{decision.message}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
