export async function parseProjectWorkbook(file) {
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  return {
    workbook,
    sheets: workbook.SheetNames,
  };
}
