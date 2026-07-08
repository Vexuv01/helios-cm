export default function WeeklyHeader({ projectName, status }) {
  return (
    <header className="weekly-control-header">
      <div>
        <span className="weekly-eyebrow">HELIOS Weekly Workspace</span>
        <h2>{projectName}</h2>
        <p>
          Inserisci solo la produzione settimanale. HELIOS salva su Supabase,
          aggiorna le quantità installate e alimenta automaticamente Control Room e Forecast.
        </p>
      </div>

      <div className="weekly-status-card">
        <span>Report Status</span>
        <strong>{status || "DRAFT"}</strong>
        <small>Autosave attivo</small>
      </div>
    </header>
  );
}
