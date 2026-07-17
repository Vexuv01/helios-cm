import { useRef, useState } from "react";
import { syncProject } from "../services/projectImportService";

export default function ProjectSyncBar() {
  const inputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const data = await syncProject({
        file,
        activitiesCount: 0,
        reportsCount: 0,
      });

      setResult({
        fileName: file.name,
        sheets: data.sheets,
        activities: data.wbsActivities.length,
      });
    } catch (err) {
      window.alert(err.message || "Import error");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="workspace-sync-card">
      <div className="workspace-sync-left">
        <span className="workspace-sync-label">
          EPC WORKBOOK
        </span>

        <h3>🔄 Sync EPC Workbook</h3>

        <p>
          Carica il workbook ricevuto dall'EPC.
          HELIOS analizzerà automaticamente il file.
        </p>
      </div>

      <div className="workspace-sync-right">
        <input
          hidden
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
        />

        <button
          className="workspace-sync-button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          {loading ? "Reading Workbook..." : "Select Workbook"}
        </button>

        {result && (
          <div className="workspace-sync-result">
            <strong>{result.fileName}</strong>

            <div>
              <b>Sheets</b>

              <ul>
                {result.sheets.map((sheet) => (
                  <li key={sheet}>✓ {sheet}</li>
                ))}
              </ul>
            </div>

            <p>
              <b>Activities detected:</b> {result.activities}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
