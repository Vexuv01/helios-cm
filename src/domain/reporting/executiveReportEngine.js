const today = new Date();

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function weekRange(start, end) {
  if (!start || !end) return [];
  const dates = [];
  let current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current = addDays(current, 7);
  }
  return dates;
}

function weight(a) {
  return n(a.weight_percent ?? a.weightPercent);
}

function baselineQty(a) {
  return n(a.baseline_quantity ?? a.baselineQuantity);
}

function installedQty(a) {
  return n(a.installed_quantity ?? a.installedQuantity);
}

function plannedStart(a) {
  return isoDate(a.planned_start ?? a.plannedStart);
}

function plannedFinish(a) {
  return isoDate(a.planned_finish ?? a.plannedFinish);
}

function actualQtyFromWeekly(activity, weeklyEntries = []) {
  const id = activity.id;
  return weeklyEntries
    .filter((e) => e.activity_id === id || e.wbs_activity_id === id || e.wbsActivityId === id)
    .reduce((sum, e) => sum + n(e.quantity ?? e.actual_quantity ?? e.installed_quantity ?? e.value), 0);
}

function progressAtDateFromPlan(wbs, date) {
  const target = new Date(date);

  const totalWeight = wbs.reduce((s, a) => s + weight(a), 0);
  if (!totalWeight) return 0;

  const plannedWeight = wbs.reduce((sum, a) => {
    const start = plannedStart(a);
    const finish = plannedFinish(a);
    const w = weight(a);

    if (!finish || !w) return sum;

    if (!start) {
      return new Date(finish) <= target ? sum + w : sum;
    }

    const s = new Date(start);
    const f = new Date(finish);

    if (target < s) return sum;
    if (target >= f) return sum + w;

    const duration = Math.max(f - s, 1);
    const elapsed = Math.max(target - s, 0);
    return sum + w * Math.min(elapsed / duration, 1);
  }, 0);

  return (plannedWeight / totalWeight) * 100;
}

function progressFromActual(wbs, weeklyEntries = []) {
  const totalWeight = wbs.reduce((s, a) => s + weight(a), 0);
  if (!totalWeight) return 0;

  const actualWeight = wbs.reduce((sum, a) => {
    const base = baselineQty(a);
    const actual = Math.max(installedQty(a), actualQtyFromWeekly(a, weeklyEntries));
    const w = weight(a);

    if (!base || !w) return sum;
    return sum + Math.min(actual / base, 1) * w;
  }, 0);

  return (actualWeight / totalWeight) * 100;
}

function buildCurve(wbs, weeklyEntries = [], recovery = null) {
  const starts = wbs.map(plannedStart).filter(Boolean);
  const finishes = wbs.map(plannedFinish).filter(Boolean);

  const minDate = starts.length ? starts.sort()[0] : isoDate(today);
  const maxDate = finishes.length ? finishes.sort()[finishes.length - 1] : isoDate(today);

  const dates = weekRange(minDate, maxDate);

  const planned = dates.map((date) => ({
    date,
    value: progressAtDateFromPlan(wbs, date),
  }));

  const actualNow = progressFromActual(wbs, weeklyEntries);

  const actual = dates.map((date) => ({
    date,
    value: new Date(date) <= today ? actualNow : null,
  }));

  const recoveryTarget = recovery ? 100 : null;
  const recoveryData = dates.map((date, index) => {
    if (!recovery) return { date, value: null };
    if (new Date(date) <= today) return { date, value: actualNow };

    const futureDates = dates.filter((d) => new Date(d) > today).length || 1;
    const futureIndex = Math.max(index - dates.findIndex((d) => new Date(d) > today), 0);
    const value = actualNow + ((recoveryTarget - actualNow) * (futureIndex + 1)) / futureDates;

    return { date, value: Math.min(value, 100) };
  });

  return { dates, planned, actual, recovery: recoveryData };
}

function disciplineBreakdown(wbs = [], weeklyEntries = []) {
  const groups = new Map();

  for (const a of wbs) {
    const key = a.discipline || a.category || a.phase || "General";
    const current = groups.get(key) || { discipline: key, weight: 0, planned: 0, actual: 0 };

    current.weight += weight(a);

    const finish = plannedFinish(a);
    if (finish && new Date(finish) <= today) current.planned += weight(a);

    const base = baselineQty(a);
    const actual = Math.max(installedQty(a), actualQtyFromWeekly(a, weeklyEntries));
    if (base) current.actual += Math.min(actual / base, 1) * weight(a);

    groups.set(key, current);
  }

  return [...groups.values()].map((g) => ({
    discipline: g.discipline,
    plannedProgress: g.weight ? (g.planned / g.weight) * 100 : 0,
    actualProgress: g.weight ? (g.actual / g.weight) * 100 : 0,
    variance: g.weight ? ((g.actual - g.planned) / g.weight) * 100 : 0,
  }));
}

function riskFromVariance(variance) {
  if (variance >= 0) return "ON TRACK";
  if (variance > -20) return "WATCH";
  return "CRITICAL";
}

function buildHighlights(snapshot) {
  const p = snapshot.progress;
  const items = [
    `Actual progress ${Math.round(p.actualProgress)}% vs planned ${Math.round(p.plannedProgress)}%.`,
    `Delta vs planned: ${Math.round(p.variance)}%.`,
    `Risk level: ${snapshot.risk}.`,
  ];

  if (snapshot.recovery) {
    items.push(`Active recovery plan: Rev.${snapshot.recovery.revision_number || "-"}.`);
  }

  return items;
}

function buildProjectReportSnapshot({ project, wbs = [], weeklyEntries = [], recovery = null }) {
  const plannedProgress = progressAtDateFromPlan(wbs, today);
  const actualProgress = progressFromActual(wbs, weeklyEntries);
  const variance = actualProgress - plannedProgress;

  const snapshot = {
    project,
    progress: {
      plannedProgress,
      actualProgress,
      variance,
    },
    risk: riskFromVariance(variance),
    recovery,
    weekly: {
      entriesCount: weeklyEntries.length,
    },
    curve: buildCurve(wbs, weeklyEntries, recovery),
    disciplines: disciplineBreakdown(wbs, weeklyEntries),
    executiveNotes: {
      achievements: [],
      challenges: [],
      nextSteps: [],
      managementRequests: [],
    },
  };

  snapshot.highlights = buildHighlights(snapshot);

  return snapshot;
}

export function buildExecutivePortfolioReport({ projects = [] }) {
  const projectSnapshots = projects.map(buildProjectReportSnapshot);

  const avgActual =
    projectSnapshots.reduce((sum, item) => sum + item.progress.actualProgress, 0) /
    Math.max(projectSnapshots.length, 1);

  const avgPlanned =
    projectSnapshots.reduce((sum, item) => sum + item.progress.plannedProgress, 0) /
    Math.max(projectSnapshots.length, 1);

  return {
    generatedAt: today.toISOString(),
    title: "Construction Overview Report",
    subtitle: "Weekly Management Report",
    portfolio: {
      projectsCount: projectSnapshots.length,
      avgActualProgress: avgActual,
      avgPlannedProgress: avgPlanned,
      criticalProjects: projectSnapshots.filter((item) => item.risk === "CRITICAL").length,
      watchProjects: projectSnapshots.filter((item) => item.risk === "WATCH").length,
      onTrackProjects: projectSnapshots.filter((item) => item.risk === "ON TRACK").length,
    },
    projects: projectSnapshots,
  };
}
