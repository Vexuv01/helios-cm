import { supabase } from "../../../lib/supabaseClient";

const EMPTY_NOTE = {
  id: null,
  projectId: null,
  weekStart: "",
  weekEnd: "",
  status: "DRAFT",
  summary: "",
  achievements: "",
  challenges: "",
  risks: "",
  managementRequests: "",
  nextWeek: "",
  achievementItems: [],
  challengeItems: [],
  riskItems: [],
  managementRequestItems: [],
  nextWeekItems: [],
  createdAt: null,
  updatedAt: null,
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapRow(row) {
  if (!row) return { ...EMPTY_NOTE };

  return {
    id: row.id,
    projectId: row.project_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    status: row.status || "DRAFT",
    summary: row.summary || "",
    achievements: row.achievements || "",
    challenges: row.challenges || "",
    risks: row.risks || "",
    managementRequests: row.management_requests || "",
    nextWeek: row.next_week || "",
    achievementItems: ensureArray(row.achievement_items),
    challengeItems: ensureArray(row.challenge_items),
    riskItems: ensureArray(row.risk_items),
    managementRequestItems: ensureArray(row.management_request_items),
    nextWeekItems: ensureArray(row.next_week_items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createEmptyExecutiveNote({
  projectId,
  weekStart,
  weekEnd,
}) {
  return {
    ...EMPTY_NOTE,
    projectId,
    weekStart,
    weekEnd,
  };
}

export async function loadExecutiveNote(projectId, weekStart) {
  const { data, error } = await supabase
    .from("executive_weekly_notes")
    .select("*")
    .eq("project_id", projectId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw error;

  return data ? mapRow(data) : null;
}

export async function loadLatestExecutiveNote(projectId) {
  const { data, error } = await supabase
    .from("executive_weekly_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ? mapRow(data) : null;
}

export async function saveExecutiveNote(note) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Authenticated user not available.");

  const payload = {
    project_id: note.projectId,
    week_start: note.weekStart,
    week_end: note.weekEnd,
    status: note.status || "DRAFT",
    summary: note.summary || "",
    achievements: note.achievements || "",
    challenges: note.challenges || "",
    risks: note.risks || "",
    management_requests: note.managementRequests || "",
    next_week: note.nextWeek || "",
    achievement_items: ensureArray(note.achievementItems),
    challenge_items: ensureArray(note.challengeItems),
    risk_items: ensureArray(note.riskItems),
    management_request_items: ensureArray(note.managementRequestItems),
    next_week_items: ensureArray(note.nextWeekItems),
    created_by: user.id,
    approved_by: note.status === "APPROVED" ? user.id : null,
  };

  const { data, error } = await supabase
    .from("executive_weekly_notes")
    .upsert(payload, {
      onConflict: "project_id,week_start",
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapRow(data);
}
