function numberValue(value) {
  return Number(value || 0);
}

function formatNumber(value, digits = 2) {
  return numberValue(value).toFixed(digits);
}

export default function WeeklyToolbar({
  weekStart,
  setWeekStart,
  weekEnd,
  setWeekEnd,
  totalThisWeek,
  activeRows,
}) {
  return (
    <section className="weekly-toolbar">
      <label>
        Week Start
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
      </label>

      <label>
        Week End
        <input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
      </label>

      <div>
        <span>This Week Qty</span>
        <strong>{formatNumber(totalThisWeek)}</strong>
      </div>

      <div>
        <span>Active Rows</span>
        <strong>{activeRows?.length || 0}</strong>
      </div>
    </section>
  );
}
