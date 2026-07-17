import { parseProjectWorkbook } from "../parser/projectWorkbookParser.js";
import { detectImportMode } from "../domain/detectImportMode.js";
import { analyzeWorkbook } from "../analysis/workbookAnalysis.js";
import { parseWbsExcelFile } from "../../wbs/import/excelParser.js";

export async function syncProject({
  file,
  activitiesCount = 0,
  reportsCount = 0,
}) {
  const parsedWorkbook = await parseProjectWorkbook(file);

  const mode = detectImportMode({
    activitiesCount,
    reportsCount,
  });

  const wbsActivities = await parseWbsExcelFile(file);

  const summary = analyzeWorkbook({
    file,
    workbook: parsedWorkbook.workbook,
    wbsActivities,
  });

  return {
    mode,
    summary,
    workbook: parsedWorkbook.workbook,
    wbsActivities,
  };
}
