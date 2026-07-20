import { parseWbsExcelFile } from "./excelParser";
import { validateWbsActivities } from "./excelValidator";
import { executeWbsImport } from "../services/wbsImportService";

function buildPreviewMessage(file, validation, activities) {
  const previewRows = activities
    .slice(0, 8)
    .map(
      (activity) =>
        `${activity.code} | ${activity.name} | ${activity.baselineQuantity} ${activity.unit} | ${activity.weightPercent}%`
    )
    .join("\n");

  return [
    "IMPORT WBS EXCEL",
    "",
    `File: ${file.name}`,
    "",
    `Activities found: ${validation.activitiesCount}`,
    `Total Weight: ${validation.totalWeight.toFixed(2)}%`,
    "",
    "Preview:",
    previewRows || "No preview available",
    "",
    "La WBS esistente e le Weekly storiche del progetto corrente verranno sostituite.",
    "",
    "Procedere con l'import?"
  ].join("\n");
}

export async function importWbsExcelFile(projectId, file) {
  const activities = await parseWbsExcelFile(file);

  const validation = validateWbsActivities(activities);

  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }

  if (!window.confirm(buildPreviewMessage(file, validation, activities))) {
    return null;
  }

  await executeWbsImport(projectId, activities);

  return validation;
}
