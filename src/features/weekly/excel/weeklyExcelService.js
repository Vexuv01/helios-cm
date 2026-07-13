import * as XLSX from "xlsx";

const SHEET_NAME = "Weekly Production";

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizedCode(value) {
  return text(value).toUpperCase();
}

function safeFilePart(value) {
  return text(value)
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function exportWeeklyExcel({
  project,
  weekStart,
  weekEnd,
  activities,
  cumulativeValues,
  weeklyValues,
}) {
  const rows = activities.map((activity) => {
    const previousCumulative = number(cumulativeValues[activity.id]);
    const thisWeek = number(weeklyValues[activity.id]);
    const projectedCumulative = previousCumulative + thisWeek;
    const baseline = number(activity.baseline_quantity);

    return {
      Code: activity.code || "",
      Activity: activity.name || "",
      Discipline: activity.discipline || "GENERAL",
      "U.M.": activity.unit || "",
      "Baseline Qty": baseline,
      "Previous Cumulative": previousCumulative,
      "This Week Qty": thisWeek,
      "Projected Cumulative": projectedCumulative,
      "Projected Progress %":
        baseline > 0
          ? Number(
              Math.min((projectedCumulative / baseline) * 100, 100).toFixed(2)
            )
          : 0,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 38 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);

  const metadata = XLSX.utils.aoa_to_sheet([
    ["HELIOS CM Enterprise"],
    ["Weekly Production Import / Export"],
    [],
    ["Project Code", project?.code || ""],
    ["Project Name", project?.name || ""],
    ["Week Start", weekStart],
    ["Week End", weekEnd],
    [],
    [
      "Import rule",
      'Compilare esclusivamente la colonna "This Week Qty". Non modificare i codici attività.',
    ],
  ]);

  metadata["!cols"] = [{ wch: 24 }, { wch: 90 }];

  XLSX.utils.book_append_sheet(workbook, metadata, "Instructions");

  const projectPart = safeFilePart(
    project ? `${project.code}_${project.name}` : "Project"
  );

  XLSX.writeFile(
    workbook,
    `HELIOS_Weekly_${projectPart}_${weekStart}_${weekEnd}.xlsx`
  );
}

export async function importWeeklyExcel(file, activities) {
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

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new Error("Il file Excel non contiene righe Weekly.");
  }

  const activityByCode = new Map(
    activities.map((activity) => [
      normalizedCode(activity.code),
      activity,
    ])
  );

  const values = {};
  const unknownCodes = [];
  const duplicateCodes = [];
  const seenCodes = new Set();
  let importedRows = 0;

  for (const row of rows) {
    const code = normalizedCode(
      row.Code ??
        row.CODE ??
        row.code ??
        row["Activity Code"]
    );

    if (!code) continue;

    if (seenCodes.has(code)) {
      duplicateCodes.push(code);
      continue;
    }

    seenCodes.add(code);

    const activity = activityByCode.get(code);

    if (!activity) {
      unknownCodes.push(code);
      continue;
    }

    const rawQuantity =
      row["This Week Qty"] ??
      row["Weekly Qty"] ??
      row["This Week"] ??
      row.Quantity ??
      row.Qty ??
      0;

    const quantity = number(
      typeof rawQuantity === "string"
        ? rawQuantity.replace(",", ".")
        : rawQuantity
    );

    if (quantity < 0) {
      throw new Error(
        `La quantità Weekly non può essere negativa: ${code}.`
      );
    }

    values[activity.id] = quantity;
    importedRows += 1;
  }

  if (!importedRows) {
    throw new Error(
      'Nessuna riga valida importata. Verifica le colonne "Code" e "This Week Qty".'
    );
  }

  return {
    values,
    importedRows,
    unknownCodes: [...new Set(unknownCodes)],
    duplicateCodes: [...new Set(duplicateCodes)],
  };
}
