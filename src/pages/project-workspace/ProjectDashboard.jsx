import { lazy, Suspense } from "react";
import { useProjectDashboard } from "../../features/dashboard/hooks/useProjectDashboard";
import "../../styles/dashboard.css";


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


const DashboardCharts = lazy(
  () =>
    import(
      "../../features/dashboard/components/DashboardCharts"
    )
);

export default function ProjectDashboard() {
  const {
    projects,
    projectId,
    dashboard,
    selectedProject,
    loading,
    refreshDashboard,
    handleProjectChange,
  } = useProjectDashboard();

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

        <div className="dashboard-actions dashboard-actions-compact">
          <label className="dashboard-project-control">
            <span>Project</span>
            <select value={projectId} onChange={handleProjectChange}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} · {project.name}
                </option>
              ))}
            </select>
          </label>

          <button
            className="dashboard-refresh-button"
            type="button"
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
            onClick={() => refreshDashboard(projectId)}
          >
            ↻
          </button>
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

          <Suspense
            fallback={
              <section className="dashboard-card">
                <div className="dashboard-empty">
                  Loading charts...
                </div>
              </section>
            }
          >
            <DashboardCharts dashboard={dashboard} />
          </Suspense>

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
