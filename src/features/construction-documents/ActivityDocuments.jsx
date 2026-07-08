import { useCallback, useEffect, useState } from "react";
import {
  DOCUMENT_CATEGORIES,
  deleteActivityDocument,
  loadActivityDocuments,
  uploadActivityDocument,
} from "./services/documentService";

export default function ActivityDocuments({ projectId, activityId, weeklyReportId }) {
  const [documents, setDocuments] = useState([]);
  const [category, setCategory] = useState("ITP");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await loadActivityDocuments({ projectId, activityId });
      setDocuments(data);
    } catch (err) {
      setError(err.message || "Unable to load documents");
    } finally {
      setLoading(false);
    }
  }, [projectId, activityId]);

  useEffect(() => {
    if (!projectId || !activityId) return;
    loadDocuments();
  }, [projectId, activityId, loadDocuments]);

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Seleziona un documento prima del caricamento.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      await uploadActivityDocument({
        projectId,
        activityId,
        weeklyReportId,
        file,
        category,
        title,
        description,
      });

      setFile(null);
      setTitle("");
      setDescription("");
      await loadDocuments();
    } catch (err) {
      setError(err.message || "Unable to upload document");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(document) {
    const confirmed = window.confirm("Vuoi eliminare definitivamente questo documento?");
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      await deleteActivityDocument(document);
      setSelectedDocument(null);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (err) {
      setError(err.message || "Unable to delete document");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="cw-operational-card">
      <div className="cw-section-title photos-title">
        <div>
          <span>Document Control</span>
          <h4>Archivio documenti attività</h4>
        </div>
        <strong>{documents.length} documenti</strong>
      </div>

      <form className="document-upload-form" onSubmit={handleUpload}>
        <label>
          File
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>

        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {DOCUMENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Es. Verbale sopralluogo DL"
          />
        </label>

        <label>
          Description
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Note documento"
          />
        </label>

        <button type="submit" disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {file && (
        <p className="document-selected">
          Selected: <strong>{file.name}</strong>
        </p>
      )}

      {error && <p className="cw-error">{error}</p>}

      {loading ? (
        <p className="cw-placeholder">Loading documents...</p>
      ) : documents.length === 0 ? (
        <div className="photo-empty-state">
          <strong>Nessun documento collegato</strong>
          <p>
            Carica ITP, verbali DL, as built, certificati, disegni o schede tecniche
            direttamente su questa attività WBS.
          </p>
        </div>
      ) : (
        <div className="document-list">
          {documents.map((document) => (
            <article key={document.id} className="document-card">
              <button type="button" onClick={() => setSelectedDocument(document)}>
                <div>
                  <span>{document.category?.replaceAll("_", " ")}</span>
                  <strong>{document.title}</strong>
                  <small>{document.file_name}</small>
                </div>
                <b>v{document.version || 1}</b>
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedDocument && (
        <div className="photo-lightbox" role="button" tabIndex={0} onClick={() => setSelectedDocument(null)}>
          <div className="document-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <div className="photo-lightbox-actions">
              <a href={selectedDocument.publicUrl} target="_blank" rel="noreferrer">
                Open
              </a>
              <a href={selectedDocument.publicUrl} download={selectedDocument.file_name}>
                Download
              </a>
              <button
                type="button"
                className="danger"
                onClick={() => handleDeleteDocument(selectedDocument)}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button type="button" onClick={() => setSelectedDocument(null)}>
                Close
              </button>
            </div>

            <div className="document-preview-box">
              <span>{selectedDocument.category?.replaceAll("_", " ")}</span>
              <h3>{selectedDocument.title}</h3>
              <p>{selectedDocument.description || "Nessuna descrizione."}</p>
              <small>{selectedDocument.file_name}</small>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
