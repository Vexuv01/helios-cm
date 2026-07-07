import { useProject } from "../../features/projects/context/useProject";

export default function ProjectDocuments() {
  const { currentProject } = useProject();

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <h2>Documents</h2>
        <p>
          Construction document control area for {currentProject?.name},
          including engineering, quality, HSE, commissioning and handover
          records.
        </p>
      </header>
    </div>
  );
}
