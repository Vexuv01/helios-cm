import { NavLink, Outlet, Link } from "react-router-dom";
import { ProjectProvider } from "../context/ProjectContext";
import { useProject } from "../context/useProject";

const workspaceTabs = [
  { label: "Control Room", path: "dashboard" },
  { label: "Construction Workspace", path: "wbs" },
  { label: "Weekly Production", path: "weekly" },
  { label: "Documents", path: "documents" },
];

function ProjectWorkspaceShell() {
  const { currentProject, projectLoading, projectError } = useProject();

  if (projectLoading) {
    return (
      <main className="workspace-state">
        <p>Loading project workspace...</p>
      </main>
    );
  }

  if (projectError) {
    return (
      <main className="workspace-state">
        <h1>Project not available</h1>
        <p>{projectError}</p>
        <Link to="/" className="workspace-back-link">
          Back to Portfolio
        </Link>
      </main>
    );
  }

  return (
    <main className="project-workspace">
      <header className="workspace-header">
        <div>
          <Link to="/" className="workspace-back-link">
            ← Portfolio
          </Link>
          <p className="workspace-eyebrow">HELIOS Project Operating System</p>
          <h1>{currentProject?.name}</h1>
          <p className="workspace-subtitle">
            {currentProject?.location || "Location not defined"}
          </p>
        </div>

        <div className="workspace-status-card">
          <span>Status</span>
          <strong>{currentProject?.status || "N/A"}</strong>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="Project workspace navigation">
        {workspaceTabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              isActive ? "workspace-tab active" : "workspace-tab"
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <section className="workspace-content">
        <Outlet />
      </section>
    </main>
  );
}

export default function ProjectWorkspaceLayout() {
  return (
    <ProjectProvider>
      <ProjectWorkspaceShell />
    </ProjectProvider>
  );
}
