import ActivityCommandCenter from "./ActivityCommandCenter";

export default function ExecutionMode({
  activities = [],
  selectedActivity,
  onSelectActivity,
  weeklyEntries = [],
}) {
  return (
    <div className="workspace-mode-grid">
      <aside className="activity-list-panel">
        <div className="panel-heading">
          <span className="eyebrow">Execution Mode</span>
          <h3>Attività WBS</h3>
        </div>

        <div className="activity-list">
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              className={
                selectedActivity?.id === activity.id
                  ? "activity-row active"
                  : "activity-row"
              }
              onClick={() => onSelectActivity(activity)}
            >
              <strong>{activity.name || activity.title}</strong>
              <span>
                {activity.discipline || activity.category || "General"} ·{" "}
                {activity.quantity || activity.baselineQuantity || 0}{" "}
                {activity.unit || ""}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <ActivityCommandCenter
        activity={selectedActivity}
        weeklyEntries={weeklyEntries}
      />
    </div>
  );
}
