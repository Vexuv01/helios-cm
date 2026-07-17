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

  addKpi(slide, "Projects", report.portfolio.projectsCount, 0.6, 4.05);
  addKpi(slide, "Avg Actual", pct(report.portfolio.avgActualProgress), 3.1, 4.05);
  addKpi(slide, "Critical", report.portfolio.criticalProjects, 5.6, 4.05, "B91C1C");
  addKpi(slide, "Watch", report.portfolio.watchProjects, 8.1, 4.05, "A16207");

  addKpi(
    slide,
    "Recovery Plans",
    report.portfolio.activeRecoveryPlans,
    0.6,
    5.15,
    "C2410C"
  );

  addKpi(
    slide,
    "Approved Notes",
    report.portfolio.approvedExecutiveNotes,
    3.1,
    5.15,
    "15803D"
  );

  addKpi(
    slide,
    "Management Requests",
    report.portfolio.managementRequests,
    5.6,
    5.15,
    "6D28D9"
  );

  addKpi(
    slide,
    "High Risks",
    report.portfolio.highRisks,
    8.1,
    5.15,
    "B91C1C"
  );

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


function bulletText(items, fallback = "No items reported.") {
  if (!items?.length) return fallback;
  return items.map((item) => `• ${item.text}`).join("\n");
}

function riskText(items) {
  if (!items?.length) return "No risks reported.";

  return items
    .map((item) => {
      const owner = item.owner ? ` · Owner: ${item.owner}` : "";
      return `• [${item.level}] ${item.text}${owner}`;
    })
    .join("\n");
}

function addNotesPanel(slide, title, body, x, y, w, h, accent = "38BDF8") {
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h,
    fill: { color: "F8FAFC" },
    line: { color: "E2E8F0", pt: 0.8 },
    radius: 0.12,
  });

  slide.addShape("rect", {
    x,
    y,
    w: 0.08,
    h,
    fill: { color: accent },
    line: { color: accent },
  });

  slide.addText(title, {
    x: x + 0.18,
    y: y + 0.12,
    w: w - 0.3,
    h: 0.25,
    fontSize: 9,
    bold: true,
    color: "0F172A",
  });

  slide.addText(body, {
    x: x + 0.18,
    y: y + 0.45,
    w: w - 0.32,
    h: h - 0.58,
    fontSize: 7.5,
    color: "334155",
    breakLine: false,
    valign: "top",
    fit: "shrink",
    margin: 0.02,
  });
}

function hasExecutiveContent(notes) {
  return Boolean(
    notes?.summary ||
      notes?.achievements?.length ||
      notes?.challenges?.length ||
      notes?.risks?.length ||
      notes?.managementRequests?.length ||
      notes?.nextWeek?.length
  );
}

function addProjectExecutiveNotesSlide(ppt, snapshot, index) {
  const notes = snapshot.executiveNotes || {
    status: "MISSING",
    weekStart: null,
    weekEnd: null,
    summary: "",
    achievements: [],
    challenges: [],
    risks: [],
    managementRequests: [],
    nextWeek: [],
  };

  if (!hasExecutiveContent(notes)) return;

  const slide = ppt.addSlide();

  addHeader(
    slide,
    `${index + 1}. ${safe(snapshot.project.name)} · Executive Update`,
    `Reporting week ${fmtDate(notes.weekStart)} — ${fmtDate(notes.weekEnd)} · Status ${notes.status}`
  );

  addNotesPanel(
    slide,
    "Executive Summary",
    notes.summary || "No executive summary reported.",
    0.55,
    1.2,
    12.15,
    1.05,
    "0EA5E9"
  );

  addNotesPanel(
    slide,
    "Achievements",
    bulletText(notes.achievements, "No achievements reported."),
    0.55,
    2.5,
    3.85,
    1.65,
    "22C55E"
  );

  addNotesPanel(
    slide,
    "Challenges",
    bulletText(notes.challenges, "No challenges reported."),
    4.65,
    2.5,
    3.85,
    1.65,
    "F59E0B"
  );

  addNotesPanel(
    slide,
    "Risks",
    riskText(notes.risks),
    8.75,
    2.5,
    3.95,
    1.65,
    "EF4444"
  );

  addNotesPanel(
    slide,
    "Management Requests",
    bulletText(notes.managementRequests, "No management requests."),
    0.55,
    4.45,
    5.95,
    1.65,
    "8B5CF6"
  );

  addNotesPanel(
    slide,
    "Next Week Focus",
    bulletText(notes.nextWeek, "No next-week priorities reported."),
    6.75,
    4.45,
    5.95,
    1.65,
    "14B8A6"
  );
}

function addDecisionLogSlide(ppt, report) {
  const requests = report.projects.flatMap((snapshot) => {
    const notes = snapshot.executiveNotes || {};
    const items = Array.isArray(notes.managementRequests)
      ? notes.managementRequests
      : [];

    return items.map((item) => ({
      project: snapshot.project.name,
      request: item.text,
      status: notes.status || "MISSING",
    }));
  });

  const risks = report.projects.flatMap((snapshot) => {
    const notes = snapshot.executiveNotes || {};
    const items = Array.isArray(notes.risks) ? notes.risks : [];

    return items
      .filter((item) => item.level === "HIGH" || item.level === "CRITICAL")
      .map((item) => ({
        project: snapshot.project.name,
        risk: item.text,
        level: item.level,
        owner: item.owner || "-",
      }));
  });

  if (!requests.length && !risks.length) return;

  const slide = ppt.addSlide();

  addHeader(
    slide,
    "Management Decisions & Portfolio Risks",
    "Consolidated from approved and ready Executive Notes"
  );

  slide.addText("Management Requests", {
    x: 0.55,
    y: 1.2,
    w: 5,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: "111827",
  });

  const requestRows = [
    [
      { text: "Project", options: { bold: true } },
      { text: "Decision / Support Required", options: { bold: true } },
      { text: "Notes Status", options: { bold: true } },
    ],
    ...requests.slice(0, 8).map((item) => [
      safe(item.project),
      item.request,
      item.status,
    ]),
  ];

  slide.addTable(requestRows, {
    x: 0.55,
    y: 1.6,
    w: 12.15,
    h: 2.05,
    fontSize: 7,
    border: { color: "E2E8F0", pt: 0.5 },
    margin: 0.04,
    color: "1E293B",
    fill: "FFFFFF",
  });

  slide.addText("High & Critical Risks", {
    x: 0.55,
    y: 4.0,
    w: 5,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: "111827",
  });

  const riskRows = [
    [
      { text: "Project", options: { bold: true } },
      { text: "Risk", options: { bold: true } },
      { text: "Level", options: { bold: true } },
      { text: "Owner", options: { bold: true } },
    ],
    ...risks.slice(0, 8).map((item) => [
      safe(item.project),
      item.risk,
      item.level,
      item.owner,
    ]),
  ];

  slide.addTable(riskRows, {
    x: 0.55,
    y: 4.4,
    w: 12.15,
    h: 2.05,
    fontSize: 7,
    border: { color: "E2E8F0", pt: 0.5 },
    margin: 0.04,
    color: "1E293B",
    fill: "FFFFFF",
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

  report.projects.forEach((snapshot, index) => {
    addProjectSlide(ppt, snapshot, index);
    addProjectExecutiveNotesSlide(ppt, snapshot, index);
  });

  addDecisionLogSlide(ppt, report);

  await ppt.writeFile({
    fileName: `HELIOS_Construction_Overview_${new Date(report.generatedAt).toISOString().slice(0, 10)}.pptx`,
  });
}
