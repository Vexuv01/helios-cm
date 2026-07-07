import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "../repositories/projectRepository";

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function buildPortfolio(projects) {
  const totalMwDc = projects.reduce(
    (sum, project) => sum + Number(project.totalPowerMwDc || 0),
    0
  );

  const totalMwAc = projects.reduce(
    (sum, project) => sum + Number(project.pvPowerMwAc || 0),
    0
  );

  const regions = unique(projects.map((project) => project.region));
  const partners = unique(projects.map((project) => project.developmentPartner));

  return {
    projects,
    kpis: {
      totalProjects: projects.length,
      totalMwDc,
      totalMwAc,
      regions: regions.length,
      partners: partners.length,
    },
    filters: {
      regions,
      partners,
    },
  };
}

export async function loadPortfolio() {
  const projects = await listProjects();
  return buildPortfolio(projects);
}

export async function savePortfolioProject(project) {
  if (project.id) return updateProject(project);
  return createProject(project);
}

export async function removePortfolioProject(id) {
  return deleteProject(id);
}
