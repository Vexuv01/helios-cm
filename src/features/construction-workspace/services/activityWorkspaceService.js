import { supabase } from "../../../lib/supabaseClient";

export async function loadActivityOverview(activityId) {
  if (!activityId) {
    return null;
  }

  const [
    activityResult,
    weeklyResult,
    photosResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("wbs_activities")
      .select("*")
      .eq("id", activityId)
      .single(),

    supabase
      .from("weekly_entries")
      .select("installed_quantity,updated_at")
      .eq("activity_id", activityId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activityId),

    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activityId),
  ]);

  if (activityResult.error) {
    throw activityResult.error;
  }

  const activity = activityResult.data;

  const installed =
    weeklyResult.data?.installed_quantity ??
    activity.installed_quantity ??
    0;

  const total =
    activity.quantity ??
    activity.baseline_quantity ??
    0;

  const remaining = Math.max(total - installed, 0);

  const progress =
    total > 0
      ? Number(((installed / total) * 100).toFixed(1))
      : 0;

  return {
    id: activity.id,
    code: activity.code,
    name: activity.name,
    unit: activity.unit,
    totalQuantity: total,
    installedQuantity: installed,
    remainingQuantity: remaining,
    progress,
    weeklyInstalled: weeklyResult.data?.installed_quantity ?? 0,
    photoCount: photosResult.count ?? 0,
    documentCount: documentsResult.count ?? 0,
    lastUpdate:
      weeklyResult.data?.updated_at ??
      activity.updated_at,
  };
}
