import { useProject } from "../../features/projects/context/useProject";

export default function ProjectWeekly() {
  const { currentProject } = useProject();

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <h2>Weekly</h2>
        <p>
          Weekly actual production reports for {currentProject?.name}. EPC
          quantities will be entered here and validated through the workflow.
        </p>
      </header>
    </div>
  );
}
