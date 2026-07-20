import { parseProjectWorkbook } from "../parser/projectWorkbookParser.js";
import { detectImportMode } from "../domain/detectImportMode.js";
import { buildImportPlan } from "../domain/buildImportPlan.js";
import { buildExecutionPipeline } from "../domain/buildExecutionPipeline.js";
import { analyzeWorkbook } from "../analysis/workbookAnalysis.js";
import { executePipeline } from "./executePipeline.js";
import { parseWbsExcelFile } from "../../wbs/import/excelParser.js";
import { executeWbsImport } from "../../wbs/services/wbsImportService.js";

export async function syncProject({
  projectId,
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

  const plan = buildImportPlan(summary);

  const pipeline = buildExecutionPipeline(plan);

  const execution = await executePipeline(
    pipeline,
    {
      baseline: () => executeWbsImport(projectId, wbsActivities),
    }
  );

  return {
    mode,
    summary,
    plan,
    pipeline,
    execution,
    workbook: parsedWorkbook.workbook,
    wbsActivities,
  };
}
