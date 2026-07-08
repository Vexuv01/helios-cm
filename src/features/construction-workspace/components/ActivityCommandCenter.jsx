function getProgress(activity) {
  if (!activity?.plannedQuantity) return 0;
  return Math.min(
    100,
    Math.round((Number(activity.actualQuantity || 0) / Number(activity.plannedQuantity)) * 100)
  );
}

export default function ActivityCommandCenter({
  activity,
  metrics,
  onChange,
  onAddActivity,
  onDeleteActivity,
}) {
  if (!activity) {
    return (
      <aside className="cw-panel cw-command">
        <div className="cw-panel-head">
          <div>
            <span>Command</span>
            <strong>Center</strong>
          </div>
        </div>
      </aside>
    );
  }

  const progress = getProgress(activity);

  return (
    <aside className="cw-panel cw-command">
      <div className="cw-panel-head">
        <div>
          <span>Command</span>
          <strong>Center</strong>
        </div>
      </div>

      <div className="cw-command-card">
        <span>Selected activity</span>
        <strong>{activity.name}</strong>
        <small>
          {activity.code} · {activity.owner}
        </small>
      </div>

      <div className="cw-command-grid">
        <div>
          <span>Activity</span>
          <strong>{progress}%</strong>
        </div>
        <div>
          <span>Workspace</span>
          <strong>{metrics.progress}%</strong>
        </div>
        <div>
          <span>In Progress</span>
          <strong>{metrics.inProgress}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{metrics.completed}</strong>
        </div>
      </div>

      <div className="cw-actions">
        <button type="button" onClick={onAddActivity}>
          Add activity
        </button>

        <button
          type="button"
          onClick={() =>
            onChange(activity.id, {
              status: "completed",
              actualQuantity: activity.plannedQuantity,
            })
          }
        >
          Mark completed
        </button>

        <button
          type="button"
          onClick={() =>
            onChange(activity.id, {
              risk: activity.risk === "high" ? "medium" : "high",
            })
          }
        >
          Toggle risk
        </button>

        <button type="button" className="danger" onClick={() => onDeleteActivity(activity.id)}>
          Delete activity
        </button>
      </div>

      <div className="cw-command-card">
        <span>Decision hint</span>
        <p>
          {activity.risk === "high"
            ? "Attività critica: serve recovery plan, verifica produttività e impatto su COD."
            : "Attività sotto controllo: continuare monitoraggio da Weekly Actual Production."}
        </p>
      </div>
    </aside>
  );
}
