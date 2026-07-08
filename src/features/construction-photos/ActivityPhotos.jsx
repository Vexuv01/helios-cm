import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadActivityPhotos,
  uploadActivityPhoto,
} from "./services/photoService";

export default function ActivityPhotos({
  projectId,
  activityId,
  weeklyReportId,
}) {
  const [photos, setPhotos] = useState([]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await loadActivityPhotos({
        projectId,
        wbsActivityId: activityId,
      });
      setPhotos(data);
    } catch (err) {
      setError(err.message || "Unable to load photos");
    } finally {
      setLoading(false);
    }
  }, [projectId, activityId]);

  useEffect(() => {
    if (!projectId || !activityId) return;
    loadPhotos();
  }, [projectId, activityId, loadPhotos]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event) {
    setError("");
    setFile(event.target.files?.[0] || null);
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Seleziona una foto prima del caricamento.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      await uploadActivityPhoto({
        projectId,
        wbsActivityId: activityId,
        weeklyReportId,
        file,
        description,
      });

      setFile(null);
      setDescription("");
      await loadPhotos();
    } catch (err) {
      setError(err.message || "Unable to upload photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="cw-operational-card">
      <div className="cw-section-title photos-title">
        <div>
          <span>Construction Photos</span>
          <h4>Diario fotografico attività</h4>
        </div>
        <strong>{photos.length} foto</strong>
      </div>

      <form className="photo-upload-form photo-upload-form-polished" onSubmit={handleUpload}>
        <label>
          Photo
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>

        <label>
          Description
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Es. Pali completati area nord, row 18"
          />
        </label>

        <button type="submit" disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>
      </form>

      {previewUrl && (
        <article className="photo-preview">
          <img src={previewUrl} alt="Preview upload" />
          <div>
            <span>Preview</span>
            <strong>{file?.name}</strong>
            <button type="button" onClick={() => setFile(null)} disabled={uploading}>
              Remove
            </button>
          </div>
        </article>
      )}

      {error && <p className="cw-error">{error}</p>}

      {loading ? (
        <p className="cw-placeholder">Loading photos...</p>
      ) : photos.length === 0 ? (
        <div className="photo-empty-state">
          <strong>Nessuna foto collegata</strong>
          <p>
            Carica la prima evidenza fotografica per questa attività WBS.
            Sarà salvata su Supabase Storage e collegata al weekly corrente.
          </p>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <article key={photo.id} className="photo-card">
              <img
                src={photo.publicUrl}
                alt={photo.description || photo.file_name || "Construction"}
              />
              <div>
                <strong>{photo.description || "Construction photo"}</strong>
                <span>
                  {photo.taken_at
                    ? new Date(photo.taken_at).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "No date"}
                </span>
                {photo.file_name && <small>{photo.file_name}</small>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
