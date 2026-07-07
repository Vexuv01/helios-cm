import { useProject } from "../../features/projects/context/useProject";

export default function ProjectSettings() {
  const { currentProject } = useProject();

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <h2>Settings</h2>
        <p>
          Project configuration for {currentProject?.name}. This area will hold
          project parameters, permissions, baseline settings and workflow rules.
        </p>
      </header>
    </div>
  );
}
