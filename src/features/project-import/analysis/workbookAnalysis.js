import { inspectWorkbook } from "../parser/workbookInspector.js";

export function analyzeWorkbook({ file, workbook, wbsActivities }) {
  const sheets = inspectWorkbook(workbook);

  const sheetNames = sheets.map((sheet) => sheet.name.toLowerCase());

  return {
    fileName: file.name,
    sheetCount: sheets.length,
    sheets,
    hasBaseline: sheetNames.some(
      (name) => name.includes("wbs") || name.includes("baseline")
    ),
    hasWeekly: sheetNames.some((name) => name.includes("weekly")),
    hasForecast: sheetNames.some(
      (name) => name.includes("forecast") || name.includes("recovery")
    ),
    activityCount: wbsActivities.length,
  };
}
