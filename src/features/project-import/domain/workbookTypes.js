export const WORKBOOK_SHEET_TYPES = {
  WBS: "WBS",
  WEEKLY: "WEEKLY",
  FORECAST: "FORECAST",
  CASHFLOW: "CASHFLOW",
  DATABASE: "DATABASE",
  UNKNOWN: "UNKNOWN",
};

const RULES = [
  {
    type: WORKBOOK_SHEET_TYPES.WBS,
    keywords: ["pianificato", "planning", "baseline"],
  },
  {
    type: WORKBOOK_SHEET_TYPES.WEEKLY,
    keywords: ["reale", "actual", "weekly"],
  },
  {
    type: WORKBOOK_SHEET_TYPES.FORECAST,
    keywords: ["forecast"],
  },
  {
    type: WORKBOOK_SHEET_TYPES.CASHFLOW,
    keywords: ["cash", "cashflow"],
  },
  {
    type: WORKBOOK_SHEET_TYPES.DATABASE,
    keywords: ["database"],
  },
];

export function detectSheetType(sheetName = "") {
  const value = sheetName.toLowerCase();

  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => value.includes(keyword))) {
      return rule.type;
    }
  }

  return WORKBOOK_SHEET_TYPES.UNKNOWN;
}
