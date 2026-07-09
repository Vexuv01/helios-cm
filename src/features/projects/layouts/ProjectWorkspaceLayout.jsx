import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { ProjectProvider } from "../context/ProjectContext";
import { useProject } from "../context/useProject";
import { useAuth } from "../../auth";

const workspaceTabs = [
  { label: "Control Room", path: "dashboard" },
  { label: "WBS Planning", path: "wbs" },
  { label: "Weekly Production", path: "weekly" },
  { label: "Documents", path: "documents" },
];

function ProjectWorkspaceShell() {
  const navigate = useNavigate();
  const { currentProject, projectLoading, projectError } = useProject();
  const { profile, user, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

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

          <p className="workspace-eyebrow">
            HELIOS PROJECT OPERATING SYSTEM
          </p>

          <h1>{currentProject?.name}</h1>
        </div>

        <div className="workspace-user">
          <span>{profile?.full_name || user?.email}</span>
          <small>{profile?.role || "USER"}</small>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav
        className="workspace-tabs"
        aria-label="Project workspace navigation"
      >
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
