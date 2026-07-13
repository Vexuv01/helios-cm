import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { LoginPage, ProtectedRoute } from "../features/auth";

const Portfolio = lazy(() => import("../pages/Portfolio"));
const ProjectWorkspaceLayout = lazy(() =>
  import("../features/projects/layouts/ProjectWorkspaceLayout")
);
const ProjectDashboard = lazy(() =>
  import("../pages/project-workspace/ProjectDashboard")
);
const ConstructionWorkspace = lazy(() =>
  import("../pages/project-workspace/ConstructionWorkspace")
);
const ProjectWeekly = lazy(() =>
  import("../pages/project-workspace/ProjectWeekly")
);
const ProjectForecast = lazy(() =>
  import("../pages/project-workspace/ProjectForecast")
);
const ProjectExecutiveNotes = lazy(() =>
  import("../pages/project-workspace/ProjectExecutiveNotes")
);
const ProjectDocuments = lazy(() =>
  import("../pages/project-workspace/ProjectDocuments")
);
const ProjectIssues = lazy(() =>
  import("../pages/project-workspace/ProjectIssues")
);
const ProjectCommissioning = lazy(() =>
  import("../pages/project-workspace/ProjectCommissioning")
);
const ProjectAnalytics = lazy(() =>
  import("../pages/project-workspace/ProjectAnalytics")
);
const ProjectSettings = lazy(() =>
  import("../pages/project-workspace/ProjectSettings")
);

function RouteLoader() {
  return (
    <main className="route-loader">
      <div>
        <span className="eyebrow">HELIOS CM Enterprise</span>
        <p>Loading workspace...</p>
      </div>
    </main>
  );
}

function ProtectedPage({ children }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<RouteLoader />}>{children}</Suspense>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedPage>
              <Portfolio />
            </ProtectedPage>
          }
        />

        <Route
          path="/projects/:projectId"
          element={
            <ProtectedPage>
              <ProjectWorkspaceLayout />
            </ProtectedPage>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ProjectDashboard />} />
          <Route path="wbs" element={<ConstructionWorkspace />} />
          <Route path="weekly" element={<ProjectWeekly />} />
          <Route path="forecast" element={<ProjectForecast />} />
          <Route path="executive-notes" element={<ProjectExecutiveNotes />} />
          <Route path="documents" element={<ProjectDocuments />} />
          <Route path="issues" element={<ProjectIssues />} />
          <Route path="commissioning" element={<ProjectCommissioning />} />
          <Route path="analytics" element={<ProjectAnalytics />} />
          <Route path="settings" element={<ProjectSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
