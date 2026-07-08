function numberValue(value) {
  return Number(value || 0);
}

function formatNumber(value, digits = 2) {
  return numberValue(value).toFixed(digits);
}

function calculateRemaining(activity) {
  return Math.max(
    numberValue(activity.baselineQuantity) - numberValue(activity.installedQuantity),
    0
  );
}

export default function WeeklyActivityCard({
  activity,
  value,
  notes,
  isSaving,
  isSaved,
  isDirty,
  onQuantityChange,
  onNotesChange,
}) {
  const progress = numberValue(activity.progress);
  const remaining = calculateRemaining(activity);

  return (
    <div className="weekly-activity-card">
      <div className="weekly-activity-main">
        <div>
          <span className="weekly-code">{activity.code}</span>
          <strong>{activity.name}</strong>
          <small>
            {formatNumber(activity.baselineQuantity)} {activity.unit} baseline ·{" "}
            {formatNumber(activity.installedQuantity)} {activity.unit} installed ·{" "}
            {formatNumber(remaining)} {activity.unit} remaining
          </small>
        </div>

        <div className="weekly-save-state">
          {isSaving ? "Saving..." : isSaved ? "Saved" : isDirty ? "Pending" : "Synced"}
        </div>
      </div>

      <div className="weekly-card-grid">
        <label>
          This Week
          <input
            type="number"
            step="0.01"
            value={value ?? 0}
            onChange={(event) => onQuantityChange(activity.id, event.target.value)}
          />
        </label>

        <label className="weekly-notes">
          Notes
          <textarea
            value={notes || ""}
            onChange={(event) => onNotesChange(activity.id, event.target.value)}
            placeholder="Note operative, impedimenti, materiali, squadre..."
          />
        </label>

        <div className="weekly-progress">
          <span>{formatNumber(progress, 1)}%</span>
          <div>
            <b style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
