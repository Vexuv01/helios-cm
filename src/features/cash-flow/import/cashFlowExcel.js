import * as XLSX from "xlsx";

const HEADER_ALIASES = {
  projectCode: [
    "pj code",
    "project code",
    "codice progetto",
  ],
  projectName: [
    "pj name",
    "project name",
    "nome progetto",
  ],
  paymentDate: [
    "data pagamento",
    "data del pagamento",
    "data prevista pagamento",
    "data prevista",
    "data scadenza",
    "scadenza",
    "data valuta",
    "data uscita",
    "payment date",
    "date",
    "data",
  ],
  amount: [
    "importo",
    "importo pagamento",
    "importo previsto",
    "totale pagamento",
    "cash out",
    "amount",
    "totale",
    "valore",
  ],
  category: [
    "tipologia costo",
    "categoria",
    "macro categoria",
    "macrocategoria",
    "category",
    "tipologia",
  ],
  detail: [
    "dettaglio costo",
    "dettaglio",
    "voce",
    "sottocategoria",
    "tipo pagamento",
    "detail",
  ],
  description: [
    "descrizione attività",
    "descrizione attivita",
    "descrizione",
    "causale",
    "oggetto",
    "description",
    "prestazione",
  ],
  orderingParty: [
    "oridinante pagamento",
    "ordinante pagamento",
    "ordinante",
    "soggetto ordinante",
    "ordering party",
  ],
  recipient: [
    "destinatario",
    "beneficiario",
    "fornitore",
    "recipient",
    "controparte",
  ],
  iban: ["iban"],
  notes: [
    "note",
    "annotazioni",
    "commenti",
    "notes",
  ],
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/[.:;]+$/g, "")
    .replace(/\s+/g, " ");
}

function normalizeAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  let text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/[€$£]/g, "");

  if (!text) return NaN;

  const negative =
    text.startsWith("(") && text.endsWith(")");

  text = text.replace(/[()]/g, "");

  let normalized = text;

  if (text.includes(",") && text.includes(".")) {
    normalized =
      text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    normalized = text
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount)) return NaN;

  return negative ? -amount : amount;
}

function excelSerialToIso(value) {
  const serial = Number(value);

  if (!Number.isFinite(serial)) return "";

  const parsed = XLSX.SSF.parse_date_code(serial);

  if (!parsed?.y || !parsed?.m || !parsed?.d) {
    return "";
  }

  const year = String(parsed.y).padStart(4, "0");
  const month = String(parsed.m).padStart(2, "0");
  const day = String(parsed.d).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function datePartsToIso(year, month, day) {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);

  if (
    !Number.isInteger(numericYear) ||
    !Number.isInteger(numericMonth) ||
    !Number.isInteger(numericDay) ||
    numericYear < 1900 ||
    numericMonth < 1 ||
    numericMonth > 12 ||
    numericDay < 1 ||
    numericDay > 31
  ) {
    return "";
  }

  const date = new Date(
    Date.UTC(
      numericYear,
      numericMonth - 1,
      numericDay
    )
  );

  if (
    date.getUTCFullYear() !== numericYear ||
    date.getUTCMonth() + 1 !== numericMonth ||
    date.getUTCDate() !== numericDay
  ) {
    return "";
  }

  return [
    String(numericYear).padStart(4, "0"),
    String(numericMonth).padStart(2, "0"),
    String(numericDay).padStart(2, "0"),
  ].join("-");
}

function normalizeDate(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  /*
   * Nel file HELIOS reale le date sono memorizzate
   * come seriali Excel, per esempio 44864.
   */
  if (typeof value === "number") {
    return excelSerialToIso(value);
  }

  /*
   * Gestione Date anche quando provengono da un
   * contesto JavaScript differente.
   */
  if (
    Object.prototype.toString.call(value) ===
    "[object Date]"
  ) {
    const timestamp = value.getTime();

    if (!Number.isFinite(timestamp)) return "";

    return datePartsToIso(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate()
    );
  }

  const text = String(value).trim();

  if (!text) return "";

  /*
   * A volte SheetJS può restituire il seriale
   * numerico sotto forma di stringa.
   */
  if (/^\d{5}(?:\.\d+)?$/.test(text)) {
    return excelSerialToIso(Number(text));
  }

  const isoMatch = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (isoMatch) {
    return datePartsToIso(
      isoMatch[1],
      isoMatch[2],
      isoMatch[3]
    );
  }

  const italianMatch = text.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/
  );

  if (italianMatch) {
    let year = italianMatch[3];

    if (year.length === 2) {
      year =
        Number(year) >= 70
          ? `19${year}`
          : `20${year}`;
    }

    return datePartsToIso(
      year,
      italianMatch[2],
      italianMatch[1]
    );
  }

  const monthYearMatch = text.match(
    /^(\d{1,2})[./-](\d{4})$/
  );

  if (monthYearMatch) {
    return datePartsToIso(
      monthYearMatch[2],
      monthYearMatch[1],
      1
    );
  }

  return "";
}

function headerMatches(header, alias) {
  return (
    normalizeText(header) === normalizeText(alias)
  );
}

function findColumn(headers, aliases) {
  for (
    let columnIndex = 0;
    columnIndex < headers.length;
    columnIndex += 1
  ) {
    const matches = aliases.some((alias) =>
      headerMatches(headers[columnIndex], alias)
    );

    if (matches) return columnIndex;
  }

  return undefined;
}

function buildColumns(headers) {
  return Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(
      ([field, aliases]) => [
        field,
        findColumn(headers, aliases),
      ]
    )
  );
}

function rowHasContent(row) {
  return Array.isArray(row) &&
    row.some(
      (cell) =>
        String(cell ?? "").trim() !== ""
    );
}

function readCell(row, index) {
  if (
    !Array.isArray(row) ||
    index === undefined ||
    index < 0
  ) {
    return "";
  }

  return row[index] ?? "";
}

function evaluateHeaderCandidate({
  sheetName,
  matrix,
  rowIndex,
}) {
  const headers = matrix[rowIndex] || [];
  const columns = buildColumns(headers);

  if (
    columns.paymentDate === undefined ||
    columns.amount === undefined
  ) {
    return null;
  }

  let score = 20;

  if (columns.projectCode !== undefined) {
    score += 12;
  }

  if (columns.projectName !== undefined) {
    score += 6;
  }

  if (columns.category !== undefined) {
    score += 5;
  }

  if (columns.detail !== undefined) {
    score += 5;
  }

  if (columns.description !== undefined) {
    score += 5;
  }

  if (columns.orderingParty !== undefined) {
    score += 2;
  }

  if (columns.recipient !== undefined) {
    score += 2;
  }

  if (columns.iban !== undefined) {
    score += 1;
  }

  if (columns.notes !== undefined) {
    score += 1;
  }

  const normalizedSheetName =
    normalizeText(sheetName);

  if (normalizedSheetName === "pj1") {
    score += 30;
  }

  if (normalizedSheetName.startsWith("pj")) {
    score += 15;
  }

  if (
    normalizedSheetName.includes("pivot") ||
    normalizedSheetName.includes("assumption") ||
    normalizedSheetName === "dati"
  ) {
    score -= 20;
  }

  /*
   * Controlliamo anche le righe reali sotto
   * l'intestazione. Un foglio operativo deve avere
   * date e importi validi.
   */
  const sampleRows = matrix.slice(
    rowIndex + 1,
    rowIndex + 21
  );

  let validSampleRows = 0;

  sampleRows.forEach((row) => {
    if (!rowHasContent(row)) return;

    const date = normalizeDate(
      readCell(row, columns.paymentDate)
    );

    const amount = normalizeAmount(
      readCell(row, columns.amount)
    );

    if (date && Number.isFinite(amount)) {
      validSampleRows += 1;
    }
  });

  score += validSampleRows * 3;

  return {
    sheetName,
    matrix,
    headerRowIndex: rowIndex,
    columns,
    score,
    validSampleRows,
  };
}

function findBestCashFlowTable(workbook) {
  const candidates = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    const matrix = XLSX.utils.sheet_to_json(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: true,
        blankrows: false,
      }
    );

    const searchLimit = Math.min(
      matrix.length,
      50
    );

    for (
      let rowIndex = 0;
      rowIndex < searchLimit;
      rowIndex += 1
    ) {
      const candidate = evaluateHeaderCandidate({
        sheetName,
        matrix,
        rowIndex,
      });

      if (candidate) {
        candidates.push(candidate);
      }
    }
  });

  candidates.sort(
    (left, right) => right.score - left.score
  );

  return candidates[0] || null;
}

function stringValue(value) {
  return String(value ?? "").trim();
}

export async function parseCashFlowExcel(file) {
  if (!file) {
    throw new Error("Seleziona un file Excel");
  }

  const buffer = await file.arrayBuffer();

  /*
   * cellDates resta disabilitato intenzionalmente.
   * In questo modo i seriali data Excel restano
   * numeri e vengono convertiti in modo deterministico.
   */
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    raw: true,
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error(
      "Il file Excel non contiene fogli"
    );
  }

  const table = findBestCashFlowTable(workbook);

  if (!table) {
    throw new Error(
      "Non è stata trovata una tabella Cash Flow contenente Data pagamento e Importo."
    );
  }

  const {
    sheetName,
    matrix,
    headerRowIndex,
    columns,
  } = table;

  const warnings = [];
  const events = [];

  let detectedProjectCode = "";
  let detectedProjectName = "";

  matrix
    .slice(headerRowIndex + 1)
    .forEach((row, index) => {
      const excelRow =
        headerRowIndex + index + 2;

      if (!rowHasContent(row)) return;

      const projectCode = stringValue(
        readCell(row, columns.projectCode)
      );

      const projectName = stringValue(
        readCell(row, columns.projectName)
      );

      const rawDate = readCell(
        row,
        columns.paymentDate
      );

      const rawAmount = readCell(
        row,
        columns.amount
      );

      const paymentDate = normalizeDate(rawDate);
      const amount = normalizeAmount(rawAmount);

      /*
       * Nel template HELIOS una riga Cash Flow
       * operativa deve avere almeno il codice progetto
       * oppure data/importo.
       */
      const hasOperationalData =
        projectCode ||
        stringValue(rawDate) ||
        stringValue(rawAmount);

      if (!hasOperationalData) return;

      /*
       * Righe di totale, subtotale o formule non
       * operative vengono ignorate.
       */
      if (!paymentDate && !Number.isFinite(amount)) {
        return;
      }

      if (!paymentDate) {
        warnings.push(
          `Riga ${excelRow}: data non valida`
        );
        return;
      }

      if (!Number.isFinite(amount)) {
        warnings.push(
          `Riga ${excelRow}: importo non valido`
        );
        return;
      }

      if (amount === 0) {
        warnings.push(
          `Riga ${excelRow}: importo pari a zero ignorato`
        );
        return;
      }

      if (
        projectCode &&
        !detectedProjectCode
      ) {
        detectedProjectCode = projectCode;
      }

      if (
        projectName &&
        !detectedProjectName
      ) {
        detectedProjectName = projectName;
      }

      events.push({
        paymentDate,
        amount: Math.abs(amount),
        category: stringValue(
          readCell(row, columns.category)
        ),
        detail: stringValue(
          readCell(row, columns.detail)
        ),
        description: stringValue(
          readCell(row, columns.description)
        ),
        orderingParty: stringValue(
          readCell(row, columns.orderingParty)
        ),
        recipient: stringValue(
          readCell(row, columns.recipient)
        ),
        iban: stringValue(
          readCell(row, columns.iban)
        ),
        notes: stringValue(
          readCell(row, columns.notes)
        ),
        sourceRowKey: [
          sheetName,
          projectCode || "NO_PROJECT",
          excelRow,
        ].join("-"),
      });
    });

  if (events.length === 0) {
    const warningPreview = warnings
      .slice(0, 8)
      .join("; ");

    throw new Error(
      warningPreview
        ? `Nessun pagamento valido trovato. ${warningPreview}`
        : "Nessun pagamento valido trovato nel file Excel"
    );
  }

  events.sort((left, right) =>
    left.paymentDate.localeCompare(
      right.paymentDate
    )
  );

  return {
    events,
    warnings,
    importedRows: events.length,
    sheetName,
    headerRow: headerRowIndex + 1,
    detectedProjectCode,
    detectedProjectName,
  };
}

export function exportCashFlowExcel({
  projectName,
  events,
}) {
  const rows = events.map((event) => ({
    "Data Pagamento": event.paymentDate,
    Importo: Number(event.amount || 0),
    "Tipologia Costo": event.category || "",
    "Dettaglio Costo": event.detail || "",
    "Descrizione attività":
      event.description || "",
    "Ordinante pagamento":
      event.orderingParty || "",
    Destinatario: event.recipient || "",
    IBAN: event.iban || "",
    NOTE: event.notes || "",
  }));

  const worksheet =
    XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 17 },
    { wch: 16 },
    { wch: 25 },
    { wch: 28 },
    { wch: 46 },
    { wch: 27 },
    { wch: 28 },
    { wch: 32 },
    { wch: 42 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Cash Flow"
  );

  const safeProjectName = String(
    projectName || "project"
  )
    .replace(/[^a-z0-9-_]/gi, "_")
    .replace(/_+/g, "_");

  XLSX.writeFile(
    workbook,
    `${safeProjectName}_cash_flow.xlsx`
  );
}

export function exportCashFlowTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      "Pj Code",
      "Pj Name",
      "Tipologia Costo",
      "Dettaglio Costo",
      "Descrizione attività",
      "Data pagamento",
      "Importo",
      "Ordinante pagamento",
      "Destinatario",
      "IBAN",
      "NOTE",
    ],
    [
      "V0015",
      "AtzoriLangiu",
      "Costi_di_Connessione",
      "SAL",
      "Pagamento avanzamento lavori",
      "2026-07-31",
      125000,
      "IPP",
      "EPC Contractor",
      "",
      "",
    ],
  ]);

  worksheet["!cols"] = [
    { wch: 13 },
    { wch: 22 },
    { wch: 25 },
    { wch: 28 },
    { wch: 46 },
    { wch: 17 },
    { wch: 16 },
    { wch: 27 },
    { wch: 28 },
    { wch: 32 },
    { wch: 42 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Pj1"
  );

  XLSX.writeFile(
    workbook,
    "HELIOS_Cash_Flow_Template.xlsx"
  );
}
