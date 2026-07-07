export const ProjectStatus = {
  DEVELOPMENT: "development",
  ENGINEERING: "engineering",
  PROCUREMENT: "procurement",
  CONSTRUCTION: "construction",
  COMMISSIONING: "commissioning",
  OPERATION: "operation",
};

export const ProjectPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export function normalizeProject(rawProject) {
  return {
    id: rawProject.id,
    code: rawProject.code ?? "",
    name: rawProject.name ?? "Unnamed Project",

    developmentPartner: rawProject.developmentPartner ?? "N.A.",
    developmentContract: rawProject.developmentContract ?? "N.A.",

    municipality: rawProject.municipality ?? "N.A.",
    province: rawProject.province ?? "N.A.",
    region: rawProject.region ?? "N.A.",

    totalPowerMwDc: Number(rawProject.totalPowerMwDc ?? 0),
    pvPowerMwDc: Number(rawProject.pvPowerMwDc ?? 0),
    pvPowerMwAc: Number(rawProject.pvPowerMwAc ?? 0),

    status: rawProject.status ?? ProjectStatus.DEVELOPMENT,
    priority: rawProject.priority ?? ProjectPriority.MEDIUM,
  };
}

export function calculateProjectDcAcRatio(project) {
  if (project.pvPowerMwAc === 0) return 0;

  return Math.round((project.pvPowerMwDc / project.pvPowerMwAc) * 100) / 100;
}
