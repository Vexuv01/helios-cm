import * as XLSX from "xlsx";
import { WBS_COLUMN_ALIASES } from "./columnMapping";

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("%", " percent")
    .replaceAll(".", "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ");
}

function readValue(row, aliases) {
  const normalized = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});

  for (const alias of aliases) {
    const value = normalized[normalizeHeader(alias)];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "";
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  return Number(String(value).replace(",", ".")) || 0;
}

function toDate(value) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function normalizeDiscipline(value) {
  const raw = String(value || "GENERAL").trim().toUpperCase().replaceAll(" ", "_");

  const aliases = {
    ENGINEERING: "ENGINEERING",
    PROCUREMENT: "PROCUREMENT",
    CIVIL: "CIVIL",
    OPERE_CIVILI: "CIVIL",
    MECHANICAL: "MECHANICAL",
    OPERE_MECCANICHE: "MECHANICAL",
    ELECTRICAL: "ELECTRICAL",
    OPERE_ELETTRICHE: "ELECTRICAL",
    COMMISSIONING: "COMMISSIONING",
    GRID: "GRID_CONNECTION",
    GRID_CONNECTION: "GRID_CONNECTION",
    OPERE_DI_RETE: "GRID_CONNECTION",
    GENERAL: "GENERAL",
  };

  return aliases[raw] || raw || "GENERAL";
}

export async function parseWbsExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) throw new Error("Excel vuoto: nessun foglio trovato.");

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
    raw: false,
  });

  return rows
    .map((row, index) => {
      const code = String(readValue(row, WBS_COLUMN_ALIASES.code)).trim();
      const name = String(readValue(row, WBS_COLUMN_ALIASES.name)).trim();

      if (!code && !name) return null;

      return {
        code: code || `ROW-${String(index + 1).padStart(3, "0")}`,
        discipline: normalizeDiscipline(readValue(row, WBS_COLUMN_ALIASES.discipline)),
        name,
        unit: String(readValue(row, WBS_COLUMN_ALIASES.unit)).trim() || "nr",
        baselineQuantity: toNumber(readValue(row, WBS_COLUMN_ALIASES.baselineQuantity)),
        installedQuantity: toNumber(readValue(row, WBS_COLUMN_ALIASES.installedQuantity)),
        weightPercent: toNumber(readValue(row, WBS_COLUMN_ALIASES.weightPercent)),
        plannedStart: toDate(readValue(row, WBS_COLUMN_ALIASES.plannedStart)),
        plannedFinish: toDate(readValue(row, WBS_COLUMN_ALIASES.plannedFinish)),
        actualStart: toDate(readValue(row, WBS_COLUMN_ALIASES.actualStart)),
        actualFinish: toDate(readValue(row, WBS_COLUMN_ALIASES.actualFinish)),
        contractor: String(readValue(row, WBS_COLUMN_ALIASES.contractor)).trim(),
        area: String(readValue(row, WBS_COLUMN_ALIASES.area)).trim(),
        subArea: String(readValue(row, WBS_COLUMN_ALIASES.subArea)).trim(),
        system: String(readValue(row, WBS_COLUMN_ALIASES.system)).trim(),
        status: String(readValue(row, WBS_COLUMN_ALIASES.status)).trim().toUpperCase() || "BASELINE",
        sortOrder: index + 1,
      };
    })
    .filter(Boolean);
}
