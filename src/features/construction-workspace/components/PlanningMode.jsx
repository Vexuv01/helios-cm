function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PlanningMode({ activity, onChange }) {
  if (!activity) {
    return <div className="cw-empty">Nessuna attività selezionata.</div>;
  }

  return (
    <div className="cw-card">
      <div className="cw-card-head">
        <div>
          <span>Planning Mode</span>
          <h2>{activity.name}</h2>
          <p>Baseline, owner, quantità pianificata e date.</p>
        </div>
        <strong>{activity.code}</strong>
      </div>

      <div className="cw-form-grid">
        <label>
          Code
          <input
            value={activity.code}
            onChange={(event) => onChange(activity.id, { code: event.target.value })}
          />
        </label>

        <label>
          Name
          <input
            value={activity.name}
            onChange={(event) => onChange(activity.id, { name: event.target.value })}
          />
        </label>

        <label>
          Discipline
          <input
            value={activity.discipline}
            onChange={(event) => onChange(activity.id, { discipline: event.target.value })}
          />
        </label>

        <label>
          Owner
          <input
            value={activity.owner}
            onChange={(event) => onChange(activity.id, { owner: event.target.value })}
          />
        </label>

        <label>
          Weight
          <input
            type="number"
            value={activity.weight}
            onChange={(event) => onChange(activity.id, { weight: toNumber(event.target.value) })}
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
          Planned start
          <input
            type="date"
            value={activity.plannedStart}
            onChange={(event) => onChange(activity.id, { plannedStart: event.target.value })}
          />
        </label>

        <label>
          Planned finish
          <input
            type="date"
            value={activity.plannedFinish}
            onChange={(event) => onChange(activity.id, { plannedFinish: event.target.value })}
          />
        </label>
      </div>

      <label className="cw-textarea">
        Planning notes
        <textarea
          rows="5"
          value={activity.notes}
          onChange={(event) => onChange(activity.id, { notes: event.target.value })}
        />
      </label>
    </div>
  );
}
