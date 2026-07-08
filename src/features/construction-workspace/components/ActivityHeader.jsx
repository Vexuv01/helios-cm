export default function ActivityHeader({ mode, onModeChange, metrics }) {
  return (
    <header className="cw-header">
      <div>
        <span className="cw-kicker">HELIOS CM Enterprise</span>
        <h1>Construction Workspace</h1>
        <p>Vista operativa unica per WBS, produzione weekly, rischio e decisioni di cantiere.</p>
      </div>

      <div className="cw-header-right">
        <div className="cw-kpi">
          <span>Progress</span>
          <strong>{metrics.progress}%</strong>
        </div>

        <div className="cw-kpi">
          <span>Activities</span>
          <strong>{metrics.totalActivities}</strong>
        </div>

        <div className="cw-kpi danger">
          <span>High Risk</span>
          <strong>{metrics.highRisk}</strong>
        </div>

        <div className="cw-toggle">
          <button
            type="button"
            className={mode === "execution" ? "active" : ""}
            onClick={() => onModeChange("execution")}
          >
            Execution
          </button>
          <button
            type="button"
            className={mode === "planning" ? "active" : ""}
            onClick={() => onModeChange("planning")}
          >
            Planning
          </button>
        </div>
      </div>
    </header>
  );
}
