import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  loadDashboardProjects,
  loadProjectDashboardSnapshot,
} from "../services/dashboardService";

export function useProjectDashboard() {
  const params = useParams();
  const navigate = useNavigate();

  const initialProjectId =
    params.projectId || params.id || "";

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) => project.id === projectId
      ),
    [projects, projectId]
  );

  const refreshDashboard = useCallback(
    async (targetProjectId = projectId) => {
      if (!targetProjectId) return;

      setLoading(true);

      try {
        const result =
          await loadProjectDashboardSnapshot(
            targetProjectId
          );

        setDashboard(result);
      } catch (error) {
        console.error(error);
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    let active = true;

    async function initializeDashboard() {
      setLoading(true);

      try {
        const rows = await loadDashboardProjects();

        if (!active) return;

        setProjects(rows);

        const nextProjectId =
          projectId ||
          initialProjectId ||
          rows[0]?.id ||
          "";

        if (
          nextProjectId &&
          nextProjectId !== projectId
        ) {
          setProjectId(nextProjectId);
          return;
        }

        if (nextProjectId) {
          const snapshot =
            await loadProjectDashboardSnapshot(
              nextProjectId
            );

          if (active) {
            setDashboard(snapshot);
          }
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setDashboard(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializeDashboard();

    return () => {
      active = false;
    };
  }, [initialProjectId, projectId]);

  useEffect(() => {
    if (!projectId) return;

    refreshDashboard(projectId);
  }, [projectId, refreshDashboard]);

  function handleProjectChange(event) {
    const nextProjectId = event.target.value;

    setProjectId(nextProjectId);
    navigate(
      `/projects/${nextProjectId}/dashboard`
    );
  }

  return {
    projects,
    projectId,
    dashboard,
    selectedProject,
    loading,
    refreshDashboard,
    handleProjectChange,
  };
}
