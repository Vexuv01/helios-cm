import { useCallback, useEffect, useState } from "react";
import ProjectControlRoom from "../../features/control-room/ProjectControlRoom";
import "../../features/control-room/control-room.css";
import { useProject } from "../../features/projects/context/useProject";
import { getConstructionSnapshot } from "../../services/constructionSnapshot.service";
import {
  CONSTRUCTION_EVENTS,
  onConstructionEvent,
} from "../../shared/events/constructionEvents";

export default function ProjectDashboard() {
  const { currentProject, projectId } = useProject();

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSnapshot = useCallback(
    async ({ silent = false } = {}) => {
      if (!projectId) return;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const data = await getConstructionSnapshot(projectId);
        setSnapshot(data);
      } catch (err) {
        setError(err.message || "Unable to load construction snapshot");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    return onConstructionEvent(CONSTRUCTION_EVENTS.SNAPSHOT_INVALIDATED, (event) => {
      if (!event?.projectId || event.projectId === projectId) {
        loadSnapshot({ silent: true });
      }
    });
  }, [projectId, loadSnapshot]);

  if (loading) return <p className="cr-empty">Loading Construction Control Room...</p>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!snapshot) return <p className="cr-empty">No construction snapshot available.</p>;

  return (
    <>
      {refreshing ? <div className="snapshot-refresh-badge">Updating snapshot...</div> : null}
      <ProjectControlRoom snapshot={snapshot} projectName={currentProject?.name} />
    </>
  );
}
