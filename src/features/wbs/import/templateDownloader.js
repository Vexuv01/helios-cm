import * as XLSX from "xlsx";

const TEMPLATE_COLUMNS = [
  "Code",
  "Discipline",
  "Activity",
  "Unit",
  "Baseline Qty",
  "Weight %",
  "Planned Start",
  "Planned Finish",
];

const SAMPLE_ROWS = [
  ["CIV-001", "CIVIL", "Recinzione", "ml", 1310, 1.12, "2026-02-09", "2026-03-03"],
  ["MEC-001", "MECHANICAL", "Battitura pali", "nr", 858, 9.0, "2026-03-10", "2026-04-15"],
  ["ELE-001", "ELECTRICAL", "Stringatura moduli", "nr", 286, 2.85, "2026-05-07", "2026-07-01"],
];

const INSTRUCTIONS = [
  ["Column", "Rule"],
  ["Code", "Required. Unique WBS activity code. Example: CIV-001."],
  ["Discipline", "Required. Suggested values: ENGINEERING, PROCUREMENT, CIVIL, MECHANICAL, ELECTRICAL, COMMISSIONING, GRID_CONNECTION, GENERAL."],
  ["Activity", "Required. Activity description."],
  ["Unit", "Required. Example: ml, nr, m3, kg, %."],
  ["Baseline Qty", "Required. Planned baseline quantity."],
  ["Weight %", "Required. Global activity weight. Total should be close to 100%."],
  ["Planned Start", "Required. Format: YYYY-MM-DD."],
  ["Planned Finish", "Required. Format: YYYY-MM-DD."],
];

export function downloadWbsTemplate() {
  const workbook = XLSX.utils.book_new();

  const wbsSheet = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...SAMPLE_ROWS]);
  const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);

  XLSX.utils.book_append_sheet(workbook, wbsSheet, "WBS");
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  XLSX.writeFile(workbook, "HELIOS_WBS_Template_v1.xlsx");
}
