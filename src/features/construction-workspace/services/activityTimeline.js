export function buildActivityTimeline(activity, weeklyQty = 0) {
  const timeline = [];

  if (activity?.createdAt || activity?.created_at) {
    timeline.push({
      type: "CREATED",
      title: "Activity created",
      date: activity.createdAt || activity.created_at,
    });
  }

  if (weeklyQty > 0) {
    timeline.unshift({
      type: "WEEKLY",
      title: `Weekly updated (+${weeklyQty})`,
      date: new Date().toISOString(),
    });
  }

  if (activity?.updatedAt || activity?.updated_at) {
    timeline.unshift({
      type: "UPDATED",
      title: "Activity updated",
      date: activity.updatedAt || activity.updated_at,
    });
  }

  return timeline;
}
