const STATUSES = ["DRAFT", "BASELINE", "IN_PROGRESS", "COMPLETED", "ON_HOLD"];

function Field({ label, children }) {
  return (
    <label className="activity-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function ActivityDrawer({
  activity,
  onClose,
  onChange,
  onSave,
  onDelete,
  saving,
}) {
  if (!activity) return null;

  return (
    <aside className="activity-drawer">
      <div className="activity-drawer-backdrop" onClick={onClose} />

      <section className="activity-drawer-panel">
        <header className="activity-drawer-header">
          <div>
            <span>Construction Activity</span>
            <h3>{activity.code} · {activity.name}</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="activity-drawer-body">
          <div className="activity-section">
            <h4>General</h4>

            <div className="activity-grid">
              <Field label="Code">
                <input value={activity.code || ""} onChange={(e) => onChange("code", e.target.value)} />
              </Field>

              <Field label="Name">
                <input value={activity.name || ""} onChange={(e) => onChange("name", e.target.value)} />
              </Field>

              <Field label="Discipline">
                <input value={activity.discipline || ""} onChange={(e) => onChange("discipline", e.target.value)} />
              </Field>

              <Field label="System">
                <input value={activity.system || ""} onChange={(e) => onChange("system", e.target.value)} />
              </Field>

              <Field label="Area">
                <input value={activity.area || ""} onChange={(e) => onChange("area", e.target.value)} />
              </Field>

              <Field label="Sub Area">
                <input value={activity.subArea || ""} onChange={(e) => onChange("subArea", e.target.value)} />
              </Field>

              <Field label="Contractor">
                <input value={activity.contractor || ""} onChange={(e) => onChange("contractor", e.target.value)} />
              </Field>

              <Field label="Status">
                <select value={activity.status || "BASELINE"} onChange={(e) => onChange("status", e.target.value)}>
                  {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="activity-section">
            <h4>Quantities & Weight</h4>

            <div className="activity-grid">
              <Field label="Unit">
                <input value={activity.unit || ""} onChange={(e) => onChange("unit", e.target.value)} />
              </Field>

              <Field label="Baseline Quantity">
                <input type="number" step="0.01" value={activity.baselineQuantity || 0} onChange={(e) => onChange("baselineQuantity", e.target.value)} />
              </Field>

              <Field label="Installed Quantity">
                <input type="number" step="0.01" value={activity.installedQuantity || 0} onChange={(e) => onChange("installedQuantity", e.target.value)} />
              </Field>

              <Field label="Weight %">
                <input type="number" step="0.001" value={activity.weightPercent || 0} onChange={(e) => onChange("weightPercent", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="activity-section">
            <h4>Planning</h4>

            <div className="activity-grid">
              <Field label="Planned Start">
                <input type="date" value={activity.plannedStart || ""} onChange={(e) => onChange("plannedStart", e.target.value)} />
              </Field>

              <Field label="Planned Finish">
                <input type="date" value={activity.plannedFinish || ""} onChange={(e) => onChange("plannedFinish", e.target.value)} />
              </Field>

              <Field label="Actual Start">
                <input type="date" value={activity.actualStart || ""} onChange={(e) => onChange("actualStart", e.target.value)} />
              </Field>

              <Field label="Actual Finish">
                <input type="date" value={activity.actualFinish || ""} onChange={(e) => onChange("actualFinish", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="activity-section">
            <h4>Notes</h4>

            <textarea
              value={activity.remarks || ""}
              onChange={(e) => onChange("remarks", e.target.value)}
              placeholder="Permanent baseline notes..."
            />
          </div>
        </div>

        <footer className="activity-drawer-footer">
          <button type="button" className="danger" onClick={() => onDelete(activity)} disabled={saving}>
            Delete
          </button>
          <button type="button" onClick={() => onSave(activity)} disabled={saving}>
            {saving ? "Saving..." : "Save Activity"}
          </button>
        </footer>
      </section>
    </aside>
  );
}
