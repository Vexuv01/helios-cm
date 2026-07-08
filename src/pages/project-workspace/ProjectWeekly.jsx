import WeeklyDiscipline from "../../features/weekly/components/WeeklyDiscipline";
import WeeklyHeader from "../../features/weekly/components/WeeklyHeader";
import WeeklyToolbar from "../../features/weekly/components/WeeklyToolbar";
import { useWeeklyWorkspace } from "../../features/weekly/hooks/useWeeklyWorkspace";
import "../../styles/weekly.css";

export default function ProjectWeekly() {
  const weekly = useWeeklyWorkspace();

  return (
    <div className="weekly-page">
      <WeeklyHeader
        projectName={weekly.currentProject?.name}
        status={weekly.workspace?.report?.status}
      />

      {weekly.error ? <div className="weekly-error">{weekly.error}</div> : null}

      <WeeklyToolbar
        weekStart={weekly.weekStart}
        setWeekStart={weekly.setWeekStart}
        weekEnd={weekly.weekEnd}
        setWeekEnd={weekly.setWeekEnd}
        totalThisWeek={weekly.totalThisWeek}
        activeRows={weekly.activeRows}
      />

      {weekly.loading ? (
        <p className="weekly-empty">Loading Weekly...</p>
      ) : !weekly.workspace?.rows?.length ? (
        <p className="weekly-empty">
          No WBS activities found. Create the WBS baseline first.
        </p>
      ) : (
        <section className="weekly-board">
          {Object.entries(weekly.groupedRows).map(([discipline, rows]) => (
            <WeeklyDiscipline
              key={discipline}
              discipline={discipline}
              rows={rows}
              expanded={weekly.expanded[discipline]}
              onToggle={weekly.toggleDiscipline}
              draftValues={weekly.draftValues}
              draftNotes={weekly.draftNotes}
              dirtyRows={weekly.dirtyRows}
              savingRows={weekly.savingRows}
              savedRows={weekly.savedRows}
              onQuantityChange={weekly.updateQuantity}
              onNotesChange={weekly.updateNotes}
            />
          ))}
        </section>
      )}
    </div>
  );
}
