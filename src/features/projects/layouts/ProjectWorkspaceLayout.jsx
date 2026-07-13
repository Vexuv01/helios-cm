import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { ProjectProvider } from "../context/ProjectContext";
import { useProject } from "../context/useProject";
import { hasOpenRecoveryPlan } from "../../forecast/services/recoveryForecastService";
import "../../../styles/project-workspace.css";

const baseWorkspaceTabs = [
  { label: "Control Room", path: "dashboard" },
  { label: "WBS Planning", path: "wbs" },
  { label: "Weekly Production", path: "weekly" },
  { label: "Executive Notes", path: "executive-notes" },
  { label: "Documents", path: "documents" },
];

function ProjectWorkspaceShell() {
  const { currentProject, projectLoading, projectError } = useProject();
  const [recoveryVisible, setRecoveryVisible] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkRecovery() {
      if (!currentProject?.id) {
        setRecoveryVisible(false);
        return;
      }

      try {
        const visible = await hasOpenRecoveryPlan(currentProject.id);
        if (active) setRecoveryVisible(visible);
      } catch {
        if (active) setRecoveryVisible(false);
      }
    }

    checkRecovery();

    return () => {
      active = false;
    };
  }, [currentProject?.id]);

  const workspaceTabs = useMemo(() => {
    if (!recoveryVisible) return baseWorkspaceTabs;

    return [
      ...baseWorkspaceTabs.slice(0, 3),
      { label: "Recovery", path: "forecast" },
      ...baseWorkspaceTabs.slice(3),
    ];
  }, [recoveryVisible]);

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
