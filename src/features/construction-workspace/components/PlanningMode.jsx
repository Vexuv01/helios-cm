export default function PlanningMode({ activities = [] }) {
  const totalActivities = activities.length;

  return (
    <section className="planning-mode">
      <div className="panel-heading">
        <span className="eyebrow">Planning Mode</span>
        <h3>Baseline & struttura WBS</h3>
        <p>
          Vista dedicata alla pianificazione: quantità baseline, discipline,
          pesi e struttura attività.
        </p>
      </div>

      <div className="planning-summary">
        <div>
          <span>Attività baseline</span>
          <strong>{totalActivities}</strong>
        </div>
        <div>
          <span>Fonte dati</span>
          <strong>Supabase WBS</strong>
        </div>
      </div>

      <div className="planning-table">
        {activities.map((activity) => (
          <div key={activity.id} className="planning-row">
            <strong>{activity.name || activity.title}</strong>
            <span>{activity.discipline || activity.category || "General"}</span>
            <span>
              {activity.quantity || activity.baselineQuantity || 0}{" "}
              {activity.unit || ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
