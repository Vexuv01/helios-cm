import { useEffect, useState } from "react";
import ProjectControlRoom from "../../features/control-room/ProjectControlRoom";
import "../../features/control-room/control-room.css";
import { useProject } from "../../features/projects/context/useProject";
import { getConstructionSnapshot } from "../../services/constructionSnapshot.service";

export default function ProjectDashboard() {
  const { currentProject, projectId } = useProject();

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSnapshot() {
      if (!projectId) return;

      setLoading(true);
      setError("");

      try {
        const data = await getConstructionSnapshot(projectId);
        if (active) setSnapshot(data);
      } catch (err) {
        if (active) setError(err.message || "Unable to load construction snapshot");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSnapshot();

    return () => {
      active = false;
    };
  }, [projectId]);

  if (loading) return <p className="cr-empty">Loading Construction Control Room...</p>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!snapshot) return <p className="cr-empty">No construction snapshot available.</p>;

  return <ProjectControlRoom snapshot={snapshot} projectName={currentProject?.name} />;
}
