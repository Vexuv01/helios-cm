import { useProject } from "../../features/projects/context/useProject";

export default function ProjectIssues() {
  const { currentProject } = useProject();

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <h2>Issues</h2>
        <p>
          Open construction issues, blockers and decisions for{" "}
          {currentProject?.name}. This module will track ownership, severity and
          due dates.
        </p>
      </header>
    </div>
  );
}
