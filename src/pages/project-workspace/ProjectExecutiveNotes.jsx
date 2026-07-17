import { useEffect, useMemo, useState } from "react";
import { useProject } from "../../features/projects/context/useProject";
import {
  createEmptyExecutiveNote,
  loadExecutiveNote,
  saveExecutiveNote,
} from "../../features/reports/services/executiveNotesService";
import "../../styles/executive-notes.css";

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value = new Date()) {
  const date = new Date(value);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + offset);
  date.setHours(12, 0, 0, 0);

  return date;
}

function endOfWorkingWeek(weekStart) {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 4);
  return date;
}

function addWeeks(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount * 7);
  return date;
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(`${value}T12:00:00`).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function createTextItem() {
  return {
    id: crypto.randomUUID(),
    text: "",
  };
}

function createRiskItem() {
  return {
    id: crypto.randomUUID(),
    text: "",
    level: "MEDIUM",
    owner: "",
  };
}

function StructuredList({
  title,
  helper,
  items,
  emptyText,
  onAdd,
  onChange,
  onRemove,
}) {
  return (
    <section className="executive-list-card">
      <header>
        <div>
          <h3>{title}</h3>
          <p>{helper}</p>
        </div>

        <button type="button" onClick={onAdd}>
          + Add
        </button>
      </header>

      {items.length === 0 ? (
        <div className="executive-list-empty">{emptyText}</div>
      ) : (
        <div className="executive-list-items">
          {items.map((item, index) => (
            <div className="executive-list-row" key={item.id}>
              <span>{index + 1}</span>

              <textarea
                rows={2}
                value={item.text}
                placeholder={`Inserisci ${title.toLowerCase()}...`}
                onChange={(event) =>
                  onChange(item.id, {
                    ...item,
                    text: event.target.value,
                  })
                }
              />

              <button
                className="executive-remove-button"
                type="button"
                aria-label={`Remove ${title} item`}
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RiskList({ items, onAdd, onChange, onRemove }) {
  return (
    <section className="executive-list-card executive-risk-card">
      <header>
        <div>
          <h3>Risks</h3>
          <p>Rischi futuri con livello di severità e owner.</p>
        </div>

        <button type="button" onClick={onAdd}>
          + Add Risk
        </button>
      </header>

      {items.length === 0 ? (
        <div className="executive-list-empty">
          Nessun rischio strutturato inserito.
        </div>
      ) : (
        <div className="executive-risk-list">
          {items.map((item, index) => (
            <article className="executive-risk-row" key={item.id}>
              <span className="executive-risk-index">{index + 1}</span>

              <textarea
                rows={2}
                value={item.text}
                placeholder="Descrizione del rischio..."
                onChange={(event) =>
                  onChange(item.id, {
                    ...item,
                    text: event.target.value,
                  })
                }
              />

              <select
                value={item.level}
                onChange={(event) =>
                  onChange(item.id, {
                    ...item,
                    level: event.target.value,
                  })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <input
                type="text"
                value={item.owner}
                placeholder="Owner"
                onChange={(event) =>
                  onChange(item.id, {
                    ...item,
                    owner: event.target.value,
                  })
                }
              />

              <button
                className="executive-remove-button"
                type="button"
                aria-label="Remove risk"
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProjectExecutiveNotes() {
  const { currentProject } = useProject();

  const initialWeek = useMemo(() => startOfWeek(), []);
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const weekStart = isoDate(selectedWeek);
  const weekEnd = isoDate(endOfWorkingWeek(selectedWeek));

  useEffect(() => {
    let active = true;

    async function loadNote() {
      if (!currentProject?.id) return;

      setLoading(true);
      setError("");
      setMessage("");

      try {
        const existing = await loadExecutiveNote(
          currentProject.id,
          weekStart
        );

        if (!active) return;

        setNote(
          existing ||
            createEmptyExecutiveNote({
              projectId: currentProject.id,
              weekStart,
              weekEnd,
            })
        );
      } catch (loadError) {
        if (active) {
          setError(
            loadError.message || "Unable to load Executive Notes."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNote();

    return () => {
      active = false;
    };
  }, [currentProject?.id, weekEnd, weekStart]);

  function updateNote(patch) {
    setNote((current) => ({
      ...current,
      ...patch,
    }));
    setMessage("");
  }

  function addItem(key, factory = createTextItem) {
    updateNote({
      [key]: [...note[key], factory()],
    });
  }

  function updateItem(key, id, value) {
    updateNote({
      [key]: note[key].map((item) =>
        item.id === id ? value : item
      ),
    });
  }

  function removeItem(key, id) {
    updateNote({
      [key]: note[key].filter((item) => item.id !== id),
    });
  }

  function moveWeek(amount) {
    setSelectedWeek((current) => addWeeks(current, amount));
  }

  async function handleSave(status) {
    if (!note) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await saveExecutiveNote({
        ...note,
        status,
      });

      setNote(saved);

      setMessage(
        status === "APPROVED"
          ? "Executive Notes approved."
          : status === "READY"
            ? "Executive Notes marked as ready."
            : "Draft saved."
      );
    } catch (saveError) {
      setError(
        saveError.message || "Unable to save Executive Notes."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !note) {
    return (
      <section className="executive-notes-page">
        <div className="executive-notes-state">
          Loading Executive Notes...
        </div>
      </section>
    );
  }

  return (
    <section className="executive-notes-page">
      <header className="executive-notes-header">
        <div>
          <span className="executive-notes-eyebrow">
            WEEKLY MANAGEMENT INPUT
          </span>

          <h2>Executive Notes</h2>

          <p>
            Dati qualitativi del progetto {currentProject?.name} utilizzati
            dall’Executive Reporting Engine.
          </p>
        </div>

        <div
          className={`executive-status status-${note.status.toLowerCase()}`}
        >
          {note.status}
        </div>
      </header>

      <div className="executive-week-toolbar">
        <button type="button" onClick={() => moveWeek(-1)}>
          ← Previous Week
        </button>

        <div>
          <span>Reporting Week</span>
          <strong>
            {formatDate(weekStart)} — {formatDate(weekEnd)}
          </strong>
        </div>

        <button type="button" onClick={() => moveWeek(1)}>
          Next Week →
        </button>
      </div>

      {error ? (
        <div className="executive-notes-banner error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="executive-notes-banner success">
          {message}
        </div>
      ) : null}

      <label className="executive-summary-card">
        <div>
          <strong>Executive Summary</strong>
          <span>
            Sintesi manageriale generale del progetto per la settimana.
          </span>
        </div>

        <textarea
          rows={6}
          value={note.summary}
          placeholder="Sintesi breve: stato, scostamento, criticità e messaggio principale per il management."
          onChange={(event) =>
            updateNote({ summary: event.target.value })
          }
        />
      </label>

      <div className="executive-structured-grid">
        <StructuredList
          title="Achievements"
          helper="Risultati e milestone raggiunti durante la settimana."
          emptyText="Nessun achievement inserito."
          items={note.achievementItems}
          onAdd={() => addItem("achievementItems")}
          onChange={(id, value) =>
            updateItem("achievementItems", id, value)
          }
          onRemove={(id) =>
            removeItem("achievementItems", id)
          }
        />

        <StructuredList
          title="Challenges"
          helper="Problemi, ritardi e blocchi operativi aperti."
          emptyText="Nessuna challenge inserita."
          items={note.challengeItems}
          onAdd={() => addItem("challengeItems")}
          onChange={(id, value) =>
            updateItem("challengeItems", id, value)
          }
          onRemove={(id) =>
            removeItem("challengeItems", id)
          }
        />

        <RiskList
          items={note.riskItems}
          onAdd={() => addItem("riskItems", createRiskItem)}
          onChange={(id, value) =>
            updateItem("riskItems", id, value)
          }
          onRemove={(id) => removeItem("riskItems", id)}
        />

        <StructuredList
          title="Management Requests"
          helper="Decisioni, escalation e supporto richiesto."
          emptyText="Nessuna richiesta al management inserita."
          items={note.managementRequestItems}
          onAdd={() => addItem("managementRequestItems")}
          onChange={(id, value) =>
            updateItem("managementRequestItems", id, value)
          }
          onRemove={(id) =>
            removeItem("managementRequestItems", id)
          }
        />

        <StructuredList
          title="Next Week Focus"
          helper="Priorità operative e risultati attesi."
          emptyText="Nessuna priorità per la prossima settimana."
          items={note.nextWeekItems}
          onAdd={() => addItem("nextWeekItems")}
          onChange={(id, value) =>
            updateItem("nextWeekItems", id, value)
          }
          onRemove={(id) =>
            removeItem("nextWeekItems", id)
          }
        />
      </div>

      <footer className="executive-notes-actions">
        <button
          className="executive-secondary-button"
          type="button"
          disabled={saving}
          onClick={() => handleSave("DRAFT")}
        >
          Save Draft
        </button>

        <button
          className="executive-ready-button"
          type="button"
          disabled={saving}
          onClick={() => handleSave("READY")}
        >
          Mark Ready
        </button>

        <button
          className="executive-primary-button"
          type="button"
          disabled={saving}
          onClick={() => handleSave("APPROVED")}
        >
          {saving ? "Saving..." : "Approve Notes"}
        </button>
      </footer>
    </section>
  );
}
