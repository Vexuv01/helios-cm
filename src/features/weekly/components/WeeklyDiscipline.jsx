import WeeklyActivityCard from "./WeeklyActivityCard";

const DISCIPLINE_LABELS = {
  ENGINEERING: "Ingegneria",
  PROCUREMENT: "Procurement",
  CIVIL: "Opere Civili",
  MECHANICAL: "Opere Meccaniche",
  ELECTRICAL: "Opere Elettriche",
  COMMISSIONING: "Collaudi e Commissioning",
  GRID_CONNECTION: "Opere di Rete",
  GENERAL: "General",
};

export default function WeeklyDiscipline({
  discipline,
  rows,
  expanded,
  onToggle,
  draftValues,
  draftNotes,
  dirtyRows,
  savingRows,
  savedRows,
  onQuantityChange,
  onNotesChange,
}) {
  return (
    <article className="weekly-discipline">
      <button type="button" className="weekly-discipline-header" onClick={() => onToggle(discipline)}>
        <span>{expanded ? "▾" : "▸"}</span>
        <strong>{DISCIPLINE_LABELS[discipline] || discipline}</strong>
        <small>{rows.length} activities</small>
      </button>

      {expanded ? (
        <div className="weekly-card-list">
          {rows.map(({ activity }) => (
            <WeeklyActivityCard
              key={activity.id}
              activity={activity}
              value={draftValues[activity.id]}
              notes={draftNotes[activity.id]}
              isSaving={savingRows[activity.id]}
              isSaved={savedRows[activity.id]}
              isDirty={dirtyRows[activity.id]}
              onQuantityChange={onQuantityChange}
              onNotesChange={onNotesChange}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
