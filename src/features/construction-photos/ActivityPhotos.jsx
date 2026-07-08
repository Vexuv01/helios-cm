import { useCallback, useEffect, useState } from "react";
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

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Select a photo before uploading.");
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
      <div className="cw-section-title">
        <span>Construction Photos</span>
        <h4>Diario fotografico attività</h4>
      </div>

      <form className="photo-upload-form" onSubmit={handleUpload}>
        <label>
          Photo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
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

        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>
      </form>

      {error && <p className="cw-error">{error}</p>}

      {loading ? (
        <p className="cw-placeholder">Loading photos...</p>
      ) : photos.length === 0 ? (
        <p className="cw-placeholder">
          Nessuna foto collegata a questa attività.
        </p>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <article key={photo.id} className="photo-card">
              <img src={photo.publicUrl} alt={photo.description || photo.file_name || "Construction"} />
              <div>
                <strong>{photo.description || "Construction photo"}</strong>
                <span>
                  {photo.taken_at
                    ? new Date(photo.taken_at).toLocaleDateString("it-IT")
                    : "No date"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
