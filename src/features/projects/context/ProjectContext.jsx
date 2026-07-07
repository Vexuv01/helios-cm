import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectWorkspace } from "../services/projectWorkspaceService";
import { ProjectContext } from "./useProject";

export function ProjectProvider({ children }) {
  const { projectId } = useParams();

  const [currentProject, setCurrentProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState(null);

  const loadProject = useCallback(async () => {
    try {
      setProjectLoading(true);
      setProjectError(null);

      const project = await getProjectWorkspace(projectId);
      setCurrentProject(project);
    } catch (error) {
      setCurrentProject(null);
      setProjectError(error.message || "Unable to load project");
    } finally {
      setProjectLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const value = useMemo(
    () => ({
      projectId,
      currentProject,
      projectLoading,
      projectError,
      reloadProject: loadProject,
    }),
    [projectId, currentProject, projectLoading, projectError, loadProject]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}
