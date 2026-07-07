function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(from, to) {
  if (!from || !to) return 0;
  const ms = toDate(to) - toDate(from);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function addDays(dateValue, days) {
  const date = toDate(dateValue);
  if (!date) return null;
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function getActivityProgress(activity) {
  return Number(
    activity?.progress ??
      activity?.progressPercent ??
      activity?.progress_percentage ??
      activity?.completion ??
      0
  );
}

function getPlannedStart(activity) {
  return (
    activity?.plannedStart ??
    activity?.planned_start ??
    activity?.startDate ??
    activity?.start_date ??
    null
  );
}

function getPlannedFinish(activity) {
  return (
    activity?.plannedFinish ??
    activity?.planned_finish ??
    activity?.finishDate ??
    activity?.finish_date ??
    activity?.endDate ??
    activity?.end_date ??
    null
  );
}

function getActualStart(activity) {
  return (
    activity?.actualStart ??
    activity?.actual_start ??
    activity?.startedAt ??
    activity?.started_at ??
    null
  );
}

function getActualFinish(activity) {
  return (
    activity?.actualFinish ??
    activity?.actual_finish ??
    activity?.completedAt ??
    activity?.completed_at ??
    null
  );
}

function getName(activity) {
  return activity?.name ?? activity?.activityName ?? activity?.title ?? "Unnamed activity";
}

function getDiscipline(activity) {
  return activity?.discipline ?? activity?.disciplineName ?? activity?.category ?? "General";
}

function getWeight(activity) {
  return Number(activity?.weight ?? activity?.weightPercent ?? activity?.weight_percentage ?? 0);
}

export function calculateTimeline({ project = null, activities = [], progress = null } = {}) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const sourceActivities = progress?.activities?.length ? progress.activities : activities;

  const normalized = sourceActivities.map((activity) => {
    const plannedStart = getPlannedStart(activity);
    const plannedFinish = getPlannedFinish(activity);
    const actualStart = getActualStart(activity);
    const actualFinish = getActualFinish(activity);
    const activityProgress = getActivityProgress(activity);

    const isComplete = activityProgress >= 100 || Boolean(actualFinish);
    const isStarted = activityProgress > 0 || Boolean(actualStart);

    const delayDays =
      plannedFinish && !isComplete && toDate(plannedFinish) < today
        ? diffDays(plannedFinish, todayIso)
        : plannedFinish && actualFinish && toDate(actualFinish) > toDate(plannedFinish)
          ? diffDays(plannedFinish, actualFinish)
          : 0;

    return {
      id: activity.id,
      name: getName(activity),
      discipline: getDiscipline(activity),
      weight: getWeight(activity),
      plannedStart,
      plannedFinish,
      actualStart: actualStart ?? (isStarted ? todayIso : null),
      actualFinish: isComplete ? actualFinish ?? todayIso : null,
      progress: activityProgress,
      delayDays,
      status: isComplete ? "COMPLETE" : delayDays > 0 ? "OVERDUE" : isStarted ? "IN_PROGRESS" : "PLANNED",
    };
  });

  const overdueActivities = normalized
    .filter((activity) => activity.status === "OVERDUE")
    .sort((a, b) => b.delayDays - a.delayDays);

  const upcomingActivities = normalized
    .filter((activity) => {
      if (!activity.plannedStart || activity.progress > 0) return false;
      const daysToStart = diffDays(todayIso, activity.plannedStart);
      return daysToStart >= 0 && daysToStart <= 21;
    })
    .sort((a, b) => toDate(a.plannedStart) - toDate(b.plannedStart));

  const lookAhead = normalized
    .filter((activity) => {
      if (!activity.plannedFinish || activity.progress >= 100) return false;
      const daysToFinish = diffDays(todayIso, activity.plannedFinish);
      return daysToFinish >= 0 && daysToFinish <= 28;
    })
    .sort((a, b) => toDate(a.plannedFinish) - toDate(b.plannedFinish));

  const totalDelayDays = overdueActivities.reduce(
    (maxDelay, activity) => Math.max(maxDelay, activity.delayDays),
    0
  );

  const plannedCOD = project?.plannedCOD ?? project?.planned_cod ?? null;
  const forecastCOD = totalDelayDays > 0 ? addDays(plannedCOD, totalDelayDays) : plannedCOD;

  const milestoneRisk =
    overdueActivities.length >= 5 || totalDelayDays >= 21
      ? "HIGH"
      : overdueActivities.length >= 2 || totalDelayDays >= 7
        ? "MEDIUM"
        : "LOW";

  return {
    today: todayIso,
    plannedStart: project?.startDate ?? project?.start_date ?? normalized[0]?.plannedStart ?? null,
    plannedFinish: plannedCOD,
    actualStart: normalized.find((activity) => activity.actualStart)?.actualStart ?? null,
    actualFinish:
      normalized.length > 0 && normalized.every((activity) => activity.progress >= 100)
        ? todayIso
        : null,
    delayDays: totalDelayDays,
    overdueActivities,
    upcomingActivities,
    lookAhead,
    milestoneRisk,
    forecastCOD,
    activities: normalized,
  };
}
