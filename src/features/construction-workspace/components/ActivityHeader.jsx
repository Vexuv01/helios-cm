export default function ActivityHeader({
  activity,
  health,
  mode,
  saving,
  onSave,
  onTabChange,
}) {
  return (
    <header className="cw-activity-header">
      <div>
        <span>
          {mode === "PLANNING"
            ? "Planning Activity"
            : "Execution Activity"}
        </span>

        <h3>{activity.name}</h3>

        <p>
          {activity.code} · {activity.discipline} · {activity.unit}
        </p>

        <small>
          Status: <strong>{activity.status}</strong>
          {" • "}
          Health: <strong>{health.label}</strong>
        </small>
      </div>

      <div className="cw-header-actions">

        <button type="button" onClick={() => onTabChange("WEEKLY")}>
          Weekly
        </button>

        <button type="button" onClick={() => onTabChange("PHOTOS")}>
          Photos
        </button>

        <button type="button" onClick={() => onTabChange("DOCUMENTS")}>
          Documents
        </button>

        <button type="button" disabled>
          Issues
        </button>

        <button type="button" disabled>
          Decisions
        </button>

        {mode === "EXECUTION" && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Execution"}
          </button>
        )}
      </div>
    </header>
  );
}
