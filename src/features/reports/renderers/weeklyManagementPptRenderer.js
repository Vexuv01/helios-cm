import pptxgen from "pptxgenjs";

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("it-IT");
}

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

function safe(value, fallback = "-") {
  return value || fallback;
}

function addHeader(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.45,
    y: 0.3,
    w: 12,
    h: 0.4,
    fontSize: 22,
    bold: true,
    color: "111827",
  });

  slide.addText(subtitle, {
    x: 0.47,
    y: 0.75,
    w: 12,
    h: 0.25,
    fontSize: 8,
    color: "6B7280",
  });
}

function addKpi(slide, label, value, x, y, color = "111827") {
  slide.addShape("roundRect", {
    x,
    y,
    w: 2.35,
    h: 0.85,
    fill: { color: "F9FAFB" },
    line: { color: "E5E7EB" },
    radius: 0.12,
  });

  slide.addText(label, {
    x: x + 0.12,
    y: y + 0.12,
    w: 2.1,
    h: 0.2,
    fontSize: 7,
    color: "6B7280",
  });

  slide.addText(String(value), {
    x: x + 0.12,
    y: y + 0.38,
    w: 2.1,
    h: 0.35,
    fontSize: 15,
    bold: true,
    color,
  });
}

function chartSeries(snapshot) {
  const labels = snapshot.curve.dates.map((d) => fmtDate(d).slice(0, 5));
  const planned = snapshot.curve.planned.map((p) => Math.round(p.value));
  const actual = snapshot.curve.actual.map((p) => (p.value === null ? null : Math.round(p.value)));
  const recovery = snapshot.curve.recovery.map((p) =>
    p.value === null ? null : Math.round(p.value)
  );

  const series = [
    { name: "Planned", labels, values: planned },
    { name: "Actual", labels, values: actual },
  ];

  if (snapshot.recovery) {
    series.push({ name: "Recovery", labels, values: recovery });
  }

  return series;
}

function addCover(ppt, report) {
  const slide = ppt.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText("HELIOS CM ENTERPRISE", {
    x: 0.6,
    y: 0.45,
    w: 5,
    h: 0.25,
    fontSize: 9,
    bold: true,
    color: "6B7280",
  });

  slide.addText(report.title, {
    x: 0.6,
    y: 2.05,
    w: 9,
    h: 0.6,
    fontSize: 30,
    bold: true,
    color: "111827",
  });

  slide.addText(`${report.subtitle} · ${fmtDate(report.generatedAt)}`, {
    x: 0.62,
    y: 2.8,
    w: 7,
    h: 0.3,
    fontSize: 12,
    color: "6B7280",
  });

  addKpi(slide, "Projects", report.portfolio.projectsCount, 0.6, 4.25);
  addKpi(slide, "Avg Actual", pct(report.portfolio.avgActualProgress), 3.1, 4.25);
  addKpi(slide, "Critical", report.portfolio.criticalProjects, 5.6, 4.25, "B91C1C");
  addKpi(slide, "Watch", report.portfolio.watchProjects, 8.1, 4.25, "A16207");

  slide.addText("Confidential", {
    x: 10.8,
    y: 6.8,
    w: 2,
    h: 0.25,
    fontSize: 8,
    color: "9CA3AF",
  });
}

function addPortfolioSlide(ppt, report) {
  const slide = ppt.addSlide();

  addHeader(
    slide,
    "Portfolio Executive Overview",
    `Generated from WBS baseline, Weekly actuals and active Recovery · ${fmtDate(report.generatedAt)}`
  );

  const rows = [
    [
      { text: "Project", options: { bold: true } },
      { text: "Planned", options: { bold: true } },
      { text: "Actual", options: { bold: true } },
      { text: "Variance", options: { bold: true } },
      { text: "Risk", options: { bold: true } },
      { text: "Recovery", options: { bold: true } },
    ],
    ...report.projects.map((item) => [
      safe(item.project.name),
      pct(item.progress.plannedProgress),
      pct(item.progress.actualProgress),
      pct(item.progress.variance),
      item.risk,
      item.recovery ? `Rev.${item.recovery.revision_number || "-"}` : "-",
    ]),
  ];

  slide.addTable(rows, {
    x: 0.55,
    y: 1.25,
    w: 12.1,
    h: 4.9,
    fontSize: 8,
    border: { color: "E5E7EB", pt: 0.5 },
    margin: 0.05,
    color: "111827",
    fill: "FFFFFF",
  });
}

function addProjectSlide(ppt, snapshot, index) {
  const { project } = snapshot;
  const slide = ppt.addSlide();

  addHeader(slide, `${index + 1}. ${safe(project.name)}`, "Project Weekly Executive Sheet");

  addKpi(slide, "Planned", pct(snapshot.progress.plannedProgress), 0.55, 1.18);
  addKpi(slide, "Actual", pct(snapshot.progress.actualProgress), 3.05, 1.18);
  addKpi(
    slide,
    "Variance",
    pct(snapshot.progress.variance),
    5.55,
    1.18,
    snapshot.progress.variance >= 0
      ? "15803D"
      : snapshot.progress.variance > -20
        ? "A16207"
        : "B91C1C"
  );
  addKpi(slide, "Risk", snapshot.risk, 8.05, 1.18);

  slide.addText("1. Project Overview", {
    x: 0.6,
    y: 2.25,
    w: 4,
    h: 0.25,
    fontSize: 11,
    bold: true,
    color: "111827",
  });

  slide.addTable(
    [
      ["Region", safe(project.region)],
      ["Comune", safe(project.municipality || project.comune)],
      ["MW DC", safe(project.capacity_dc || project.dc_mw || project.totalPowerMwDc)],
      ["MW AC", safe(project.capacity_ac || project.ac_mw || project.pvPowerMwAc)],
      ["EPC", safe(project.epc_contractor)],
      ["Project Manager", safe(project.project_manager)],
      ["Planned COD", fmtDate(project.planned_cod || project.cod)],
    ],
    {
      x: 0.6,
      y: 2.6,
      w: 4.15,
      h: 2.05,
      fontSize: 8,
      border: { color: "E5E7EB", pt: 0.5 },
      margin: 0.05,
    }
  );

  slide.addText("2. S-Curve", {
    x: 5.05,
    y: 2.25,
    w: 2,
    h: 0.25,
    fontSize: 11,
    bold: true,
    color: "111827",
  });

  slide.addChart(ppt.ChartType.line, chartSeries(snapshot), {
    x: 5.05,
    y: 2.6,
    w: 6.95,
    h: 2.2,
    catAxisLabelFontFace: "Aptos",
    catAxisLabelFontSize: 6,
    valAxisLabelFontSize: 7,
    showLegend: true,
    showValue: false,
    valAxisMinVal: 0,
    valAxisMaxVal: 100,
    valAxisMajorUnit: 20,
  });

  slide.addText("3. Highlights", {
    x: 0.6,
    y: 5.05,
    w: 2,
    h: 0.25,
    fontSize: 11,
    bold: true,
    color: "111827",
  });

  slide.addText(snapshot.highlights.map((h) => `• ${h}`).join("\n"), {
    x: 0.6,
    y: 5.38,
    w: 5.6,
    h: 1.05,
    fontSize: 8,
    color: "374151",
    fit: "shrink",
  });

  slide.addText("4. Discipline Status", {
    x: 6.55,
    y: 5.05,
    w: 3,
    h: 0.25,
    fontSize: 11,
    bold: true,
    color: "111827",
  });

  const rows = [
    [
      { text: "Discipline", options: { bold: true } },
      { text: "Planned", options: { bold: true } },
      { text: "Actual", options: { bold: true } },
      { text: "Δ", options: { bold: true } },
    ],
    ...snapshot.disciplines.slice(0, 5).map((d) => [
      d.discipline,
      pct(d.plannedProgress),
      pct(d.actualProgress),
      pct(d.variance),
    ]),
  ];

  slide.addTable(rows, {
    x: 6.55,
    y: 5.38,
    w: 5.45,
    h: 1.1,
    fontSize: 7,
    border: { color: "E5E7EB", pt: 0.5 },
    margin: 0.04,
  });
}

export async function renderWeeklyManagementPpt(report) {
  const ppt = new pptxgen();

  ppt.layout = "LAYOUT_WIDE";
  ppt.author = "HELIOS CM Enterprise";
  ppt.company = "Vexuvo";
  ppt.subject = "Construction Overview Weekly Report";
  ppt.title = "Construction Overview Report";
  ppt.lang = "it-IT";

  addCover(ppt, report);
  addPortfolioSlide(ppt, report);
  report.projects.forEach((snapshot, index) => addProjectSlide(ppt, snapshot, index));

  await ppt.writeFile({
    fileName: `HELIOS_Construction_Overview_${new Date(report.generatedAt).toISOString().slice(0, 10)}.pptx`,
  });
}
