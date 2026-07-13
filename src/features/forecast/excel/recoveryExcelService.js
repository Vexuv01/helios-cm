import * as XLSX from "xlsx";

const SHEET_NAME = "Recovery Forecast";

function text(value) {
  return String(value ?? "").trim();
}

function normalizedCode(value) {
  return text(value).toUpperCase();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeFilePart(value) {
  return text(value)
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function excelDateToIso(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      return [
        parsed.y,
        String(parsed.m).padStart(2, "0"),
        String(parsed.d).padStart(2, "0"),
      ].join("-");
    }
  }

  const raw = text(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const italian = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (italian) {
    return [
      italian[3],
      italian[2].padStart(2, "0"),
      italian[1].padStart(2, "0"),
    ].join("-");
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

function validateDateRange(code, start, finish) {
  if (!start || !finish) return;

  if (new Date(`${finish}T12:00:00`) < new Date(`${start}T12:00:00`)) {
    throw new Error(
      `Forecast Finish precedente a Forecast Start per ${code}.`
    );
  }
}

export function exportRecoveryExcel({
  projectId,
  revision,
  rows,
}) {
  const data = rows.map((row) => ({
    Code: row.code,
    Activity: row.name,
    Discipline: row.discipline,
    "U.M.": row.unit,
    "Baseline Qty": toNumber(row.baselineQuantity),
    "Actual Qty": toNumber(row.actualQuantity),
    "Remaining Qty": toNumber(row.remainingQuantity),
    "Weight %": toNumber(row.weightPercent),
    "Baseline Start": row.plannedStart || "",
    "Baseline Finish": row.plannedFinish || "",
    "Forecast Start": row.forecastStart || "",
    "Forecast Finish": row.forecastFinish || "",
    "Forecast Note": row.forecastNote || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 38 },
    { wch: 18 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 17 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 48 },
  ];

  const instructions = XLSX.utils.aoa_to_sheet([
    ["HELIOS CM Enterprise"],
    ["Recovery Forecast Import / Export"],
    [],
    ["Project ID", projectId],
    ["Revision", `Rev.${revision?.revisionNumber || 1}`],
    ["Revision Title", revision?.title || ""],
    ["Issue Date", revision?.issueDate || ""],
    [],
    [
      "Import rule",
      "Modificare solo Forecast Start, Forecast Finish e Forecast Note. Non modificare i codici attività.",
    ],
  ]);

  instructions["!cols"] = [{ wch: 24 }, { wch: 95 }];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");

  const revisionPart = safeFilePart(
    `Rev_${revision?.revisionNumber || 1}_${revision?.title || "Recovery"}`
  );

  XLSX.writeFile(
    workbook,
    `HELIOS_Recovery_${revisionPart}_${revision?.issueDate || "Draft"}.xlsx`
  );
}

export async function importRecoveryExcel(file, rows) {
  if (!file) throw new Error("Seleziona un file Excel.");

  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const worksheet =
    workbook.Sheets[SHEET_NAME] ||
    workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error("Il file Excel non contiene fogli leggibili.");
  }

  const importedRows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: true,
  });

  if (!importedRows.length) {
    throw new Error("Il file Recovery non contiene righe.");
  }

  const rowByCode = new Map(
    rows.map((row) => [normalizedCode(row.code), row])
  );

  const updates = {};
  const unknownCodes = [];
  const duplicateCodes = [];
  const seenCodes = new Set();
  let updatedRows = 0;

  for (const imported of importedRows) {
    const code = normalizedCode(
      imported.Code ??
        imported.CODE ??
        imported.code ??
        imported["Activity Code"]
    );

    if (!code) continue;

    if (seenCodes.has(code)) {
      duplicateCodes.push(code);
      continue;
    }

    seenCodes.add(code);

    const existing = rowByCode.get(code);

    if (!existing) {
      unknownCodes.push(code);
      continue;
    }

    const forecastStart = excelDateToIso(
      imported["Forecast Start"] ??
        imported.ForecastStart ??
        imported.forecast_start
    );

    const forecastFinish = excelDateToIso(
      imported["Forecast Finish"] ??
        imported.ForecastFinish ??
        imported.forecast_finish
    );

    validateDateRange(code, forecastStart, forecastFinish);

    updates[existing.activityId] = {
      forecastStart,
      forecastFinish,
      forecastNote: text(
        imported["Forecast Note"] ??
          imported.ForecastNote ??
          imported.forecast_note
      ),
    };

    updatedRows += 1;
  }

  if (!updatedRows) {
    throw new Error(
      'Nessuna attività valida importata. Verifica la colonna "Code".'
    );
  }

  return {
    updates,
    updatedRows,
    unknownCodes: [...new Set(unknownCodes)],
    duplicateCodes: [...new Set(duplicateCodes)],
  };
}
