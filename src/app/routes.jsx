import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Portfolio from "../pages/Portfolio";
import ProjectWorkspaceLayout from "../features/projects/layouts/ProjectWorkspaceLayout";

import ProjectDashboard from "../pages/project-workspace/ProjectDashboard";
import ConstructionWorkspace from "../pages/project-workspace/ConstructionWorkspace";
import ProjectWeekly from "../pages/project-workspace/ProjectWeekly";
import ProjectDocuments from "../pages/project-workspace/ProjectDocuments";
import ProjectIssues from "../pages/project-workspace/ProjectIssues";
import ProjectCommissioning from "../pages/project-workspace/ProjectCommissioning";
import ProjectAnalytics from "../pages/project-workspace/ProjectAnalytics";
import ProjectSettings from "../pages/project-workspace/ProjectSettings";

import { LoginPage, ProtectedRoute } from "../features/auth";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Portfolio />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectWorkspaceLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ProjectDashboard />} />
          <Route path="wbs" element={<ConstructionWorkspace />} />
          <Route path="weekly" element={<ProjectWeekly />} />
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
