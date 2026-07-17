import { loadRealConstructionDashboard } from "../../../services/constructionEngine.service";
import { listProjects } from "../repositories/projectRepository";

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 1) {
  return Number(n(value).toFixed(digits));
}

function classifyRisk(snapshot) {
  if (!snapshot) return "NO_DATA";
  if (snapshot.healthScore < 55 || snapshot.scheduleGap < -15) return "HIGH";
  if (snapshot.healthScore < 70 || snapshot.scheduleGap < -5) return "MEDIUM";
  return "LOW";
}

function buildProjectExecutive(project, snapshot) {
  const criticalCount = snapshot?.criticalActivities?.length ?? 0;
  const weeklyReports = snapshot?.weeklyReports ?? 0;
  const weeklyEntries = snapshot?.weeklyEntries ?? 0;

  return {
    ...project,
    executive: {
      progress: round(snapshot?.totalProgress ?? 0),
      planned: round(snapshot?.plannedProgress ?? 0),
      health: Math.round(n(snapshot?.healthScore ?? 0)),
      delay: round(snapshot?.scheduleGap ?? 0),
      critical: criticalCount,
      weeklyReports,
      weeklyEntries,
      risk: classifyRisk(snapshot),
      forecastCOD: snapshot?.project?.forecastCOD || snapshot?.project?.plannedCOD || "",
      plannedCOD: snapshot?.project?.plannedCOD || "",
      hasWeekly: weeklyReports > 0,
      dataSource: snapshot?.dataSource ?? null,
      decision: snapshot?.decisionFeed?.[0] ?? null,
    },
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function buildKpis(projects) {
  const totalMwDc = projects.reduce((sum, project) => sum + n(project.totalPowerMwDc), 0);
  const totalMwAc = projects.reduce((sum, project) => sum + n(project.pvPowerMwAc), 0);
  const projectsWithData = projects.filter((project) => project.executive?.dataSource);

  const avgProgress =
    projects.length > 0
      ? round(projects.reduce((sum, project) => sum + n(project.executive?.progress), 0) / projects.length)
      : 0;

  const avgHealth =
    projects.length > 0
      ? Math.round(projects.reduce((sum, project) => sum + n(project.executive?.health), 0) / projects.length)
      : 0;

  return {
    totalProjects: projects.length,
    totalMwDc,
    totalMwAc,
    avgProgress,
    avgHealth,
    projectsAtRisk: projects.filter((project) => project.executive?.risk === "HIGH").length,
    delayedProjects: projects.filter((project) => n(project.executive?.delay) < 0).length,
    noWeekly: projects.filter((project) => !project.executive?.hasWeekly).length,
    engineReady: projectsWithData.length,
  };
}

export async function loadPortfolioExecutive() {
  const projects = await listProjects();

  const snapshots = await Promise.allSettled(
    projects.map((project) => loadRealConstructionDashboard(project.id))
  );

  const executiveProjects = projects.map((project, index) => {
    const result = snapshots[index];
    const snapshot = result.status === "fulfilled" ? result.value : null;

    return buildProjectExecutive(project, snapshot);
  });

  const regions = unique(executiveProjects.map((project) => project.region));
  const partners = unique(executiveProjects.map((project) => project.developmentPartner));

  return {
    projects: executiveProjects,
    kpis: buildKpis(executiveProjects),
    filters: {
      regions,
      partners,
    },
  };
}
