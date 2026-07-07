import { useProject } from "../../features/projects/context/useProject";

export default function ProjectCommissioning() {
  const { currentProject } = useProject();

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <h2>Commissioning</h2>
        <p>
          Mechanical completion, cold commissioning, hot commissioning and PAC
          readiness for {currentProject?.name}.
        </p>
      </header>
    </div>
  );
}
