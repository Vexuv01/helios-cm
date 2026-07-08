import {
  toNumber,
  progress,
  remaining,
  percent,
} from "./activityMetrics.js";

import { activityHealth } from "./activityHealth.js";

export function buildActivityViewModel(activity, weeklyQty = 0) {
  const health = activityHealth(activity);

  return {
    ...activity,

    baseline: toNumber(activity.baselineQuantity),

    installed: toNumber(activity.installedQuantity),

    remaining: remaining(activity),

    weekly: toNumber(weeklyQty),

    progress: progress(activity),

    progressLabel: percent(progress(activity)),

    health,
  };
}
