function getProgress(activity) {
  if (!activity?.plannedQuantity) return 0;
  return Math.min(
    100,
    Math.round((Number(activity.actualQuantity || 0) / Number(activity.plannedQuantity)) * 100)
  );
}

export default function ConstructionTree({ activities, selectedId, onSelect, onAddActivity }) {
  return (
    <aside className="cw-panel cw-tree">
      <div className="cw-panel-head">
        <div>
          <span>WBS</span>
          <strong>Construction Tree</strong>
        </div>
        <button type="button" onClick={onAddActivity}>
          + Add
        </button>
      </div>

      <div className="cw-tree-list">
        {activities.map((activity) => {
          const progress = getProgress(activity);

          return (
            <button
              type="button"
              key={activity.id}
              className={`cw-tree-row ${selectedId === activity.id ? "selected" : ""}`}
              onClick={() => onSelect(activity.id)}
            >
              <span className={`cw-dot ${activity.status}`} />
              <span className="cw-tree-main">
                <strong>
                  {activity.code} · {activity.name}
                </strong>
                <small>
                  {activity.discipline} · {progress}% · {activity.actualQuantity}/
                  {activity.plannedQuantity} {activity.unit}
                </small>
              </span>
              <span className={`cw-risk ${activity.risk}`}>{activity.risk}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
