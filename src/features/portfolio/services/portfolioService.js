import {
  createProject,
  deleteProject,
  updateProject,
} from "../repositories/projectRepository";
import { loadPortfolioExecutive } from "./portfolioExecutiveService";

export async function loadPortfolio() {
  return loadPortfolioExecutive();
}

export async function savePortfolioProject(project) {
  if (project.id) return updateProject(project);
  return createProject(project);
}

export async function removePortfolioProject(id) {
  return deleteProject(id);
}
