import { useProject } from "../../features/projects/context/useProject";

export default function ProjectAnalytics() {
  const { currentProject } = useProject();

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <h2>Analytics</h2>
        <p>
          Construction analytics for {currentProject?.name}. This area will show
          productivity, deviations, forecast confidence and portfolio-level
          insights.
        </p>
      </header>
    </div>
  );
}
