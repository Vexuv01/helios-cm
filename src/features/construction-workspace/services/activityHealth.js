import { progress } from "./activityMetrics.js";

export function activityHealth(activity) {
  const p = progress(activity);

  if (activity?.status === "COMPLETED") {
    return {
      label: "Completed",
      color: "green",
    };
  }

  if (activity?.status === "ON_HOLD") {
    return {
      label: "On Hold",
      color: "red",
    };
  }

  if (p >= 90) {
    return {
      label: "Almost Complete",
      color: "green",
    };
  }

  if (p >= 40) {
    return {
      label: "In Progress",
      color: "orange",
    };
  }

  return {
    label: "Not Started",
    color: "gray",
  };
}
