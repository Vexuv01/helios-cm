import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Portfolio from "../pages/Portfolio";
import ProjectWorkspaceLayout from "../features/projects/layouts/ProjectWorkspaceLayout";

import ProjectDashboard from "../pages/project-workspace/ProjectDashboard";
import ProjectWbs from "../pages/project-workspace/ProjectWbs";
import ProjectWeekly from "../pages/project-workspace/ProjectWeekly";
import ProjectDocuments from "../pages/project-workspace/ProjectDocuments";
import ProjectIssues from "../pages/project-workspace/ProjectIssues";
import ProjectCommissioning from "../pages/project-workspace/ProjectCommissioning";
import ProjectAnalytics from "../pages/project-workspace/ProjectAnalytics";
import ProjectSettings from "../pages/project-workspace/ProjectSettings";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portfolio />} />

        <Route path="/projects/:projectId" element={<ProjectWorkspaceLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ProjectDashboard />} />
          <Route path="wbs" element={<ProjectWbs />} />
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
