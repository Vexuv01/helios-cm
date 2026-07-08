export default function ActivityCommandCenter({ activity, weeklyEntries = [] }) {
  if (!activity) {
    return (
      <section className="activity-command-center empty">
        <h2>Nessuna attività selezionata</h2>
        <p>Seleziona un’attività WBS per entrare in modalità operativa.</p>
      </section>
    );
  }

  const actualQuantity = weeklyEntries
    .filter((entry) => entry.activityId === activity.id)
    .reduce((sum, entry) => sum + Number(entry.actualQuantity || entry.quantity || 0), 0);

  const baselineQuantity = Number(activity.quantity || activity.baselineQuantity || 0);
  const progress = baselineQuantity > 0 ? Math.min(100, Math.round((actualQuantity / baselineQuantity) * 100)) : 0;
  const remaining = Math.max(0, baselineQuantity - actualQuantity);

  return (
    <section className="activity-command-center">
      <div>
        <span className="eyebrow">Activity Command Center</span>
        <h2>{activity.name || activity.title}</h2>
        <p>{activity.discipline || activity.category || "Construction Activity"}</p>
      </div>

      <div className="activity-kpi-grid">
        <div className="activity-kpi">
          <span>Baseline</span>
          <strong>{baselineQuantity}</strong>
          <small>{activity.unit || "unità"}</small>
        </div>

        <div className="activity-kpi">
          <span>Actual</span>
          <strong>{actualQuantity}</strong>
          <small>{activity.unit || "unità"}</small>
        </div>

        <div className="activity-kpi">
          <span>Remaining</span>
          <strong>{remaining}</strong>
          <small>{activity.unit || "unità"}</small>
        </div>

        <div className="activity-kpi">
          <span>Progress</span>
          <strong>{progress}%</strong>
          <small>weekly actual</small>
        </div>
      </div>

      <div className="execution-progress">
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className="next-action-box">
        <span>Next action</span>
        <strong>
          {progress >= 100
            ? "Attività completata: pronta per verifica / evidenze."
            : "Aggiorna weekly, foto e documenti collegati a questa attività."}
        </strong>
      </div>
    </section>
  );
}
