import * as XLSX from "xlsx";

function sheetRange(sheet) {
  if (!sheet || !sheet["!ref"]) {
    return {
      rows: 0,
      columns: 0,
    };
  }

  const range = XLSX.utils.decode_range(sheet["!ref"]);

  return {
    rows: range.e.r + 1,
    columns: range.e.c + 1,
  };
}

function firstRow(sheet) {
  if (!sheet) return [];

  return (
    XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: 0,
      blankrows: false,
    })[0] || []
  );
}

export function inspectWorkbook(workbook) {
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];

    return {
      name,
      ...sheetRange(sheet),
      headers: firstRow(sheet),
    };
  });
}
