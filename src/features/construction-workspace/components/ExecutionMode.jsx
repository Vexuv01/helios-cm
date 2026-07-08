function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getProgress(activity) {
  if (!activity?.plannedQuantity) return 0;
  return Math.min(
    100,
    Math.round((Number(activity.actualQuantity || 0) / Number(activity.plannedQuantity)) * 100)
  );
}

export default function ExecutionMode({ activity, onChange }) {
  if (!activity) {
    return <div className="cw-empty">Nessuna attività selezionata.</div>;
  }

  const progress = getProgress(activity);

  return (
    <div className="cw-card">
      <div className="cw-card-head">
        <div>
          <span>Execution Mode</span>
          <h2>{activity.name}</h2>
          <p>{activity.discipline}</p>
        </div>
        <span className={`cw-risk ${activity.risk}`}>{activity.risk}</span>
      </div>

      <div className="cw-progress-box">
        <div>
          <span>Actual production</span>
          <strong>{progress}%</strong>
        </div>
        <div className="cw-progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="cw-form-grid">
        <label>
          Actual quantity
          <input
            type="number"
            value={activity.actualQuantity}
            onChange={(event) =>
              onChange(activity.id, { actualQuantity: toNumber(event.target.value) })
            }
          />
        </label>

        <label>
          Planned quantity
          <input
            type="number"
            value={activity.plannedQuantity}
            onChange={(event) =>
              onChange(activity.id, { plannedQuantity: toNumber(event.target.value) })
            }
          />
        </label>

        <label>
          Unit
          <input
            value={activity.unit}
            onChange={(event) => onChange(activity.id, { unit: event.target.value })}
          />
        </label>

        <label>
          Status
          <select
            value={activity.status}
            onChange={(event) => onChange(activity.id, { status: event.target.value })}
          >
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <label>
          Risk
          <select
            value={activity.risk}
            onChange={(event) => onChange(activity.id, { risk: event.target.value })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          Forecast finish
          <input
            type="date"
            value={activity.forecastFinish}
            onChange={(event) => onChange(activity.id, { forecastFinish: event.target.value })}
          />
        </label>
      </div>

      <label className="cw-textarea">
        Execution notes
        <textarea
          rows="5"
          value={activity.notes}
          onChange={(event) => onChange(activity.id, { notes: event.target.value })}
        />
      </label>
    </div>
  );
}
