import { supabase } from "../../../lib/supabaseClient";

const TABLE = "projects";

function fromDb(row) {
  return {
    id: row.id,
    code: row.code ?? "",
    name: row.name ?? "",
    municipality: row.municipality ?? row.location ?? "",
    province: row.province ?? "",
    region: row.region ?? "",
    developmentPartner: row.development_partner ?? row.client ?? "",
    developmentContract: row.development_contract ?? "",
    totalPowerMwDc: Number(row.total_power_mw_dc ?? row.capacity_dc_mw ?? 0),
    pvPowerMwDc: Number(row.pv_power_mw_dc ?? row.capacity_dc_mw ?? 0),
    pvPowerMwAc: Number(row.pv_power_mw_ac ?? row.capacity_ac_mw ?? 0),
    status: row.status ?? "PLANNED",
    priority: row.priority ?? "MEDIUM",
  };
}

function toDb(project) {
  return {
    code: project.code,
    name: project.name,
    municipality: project.municipality,
    province: project.province,
    region: project.region,
    development_partner: project.developmentPartner,
    development_contract: project.developmentContract,
    total_power_mw_dc: Number(project.totalPowerMwDc || 0),
    pv_power_mw_dc: Number(project.pvPowerMwDc || 0),
    pv_power_mw_ac: Number(project.pvPowerMwAc || 0),
    location: project.municipality,
    client: project.developmentPartner,
    capacity_dc_mw: Number(project.totalPowerMwDc || 0),
    capacity_ac_mw: Number(project.pvPowerMwAc || 0),
    status: project.status,
    priority: project.priority,
    updated_at: new Date().toISOString(),
  };
}

function assertResult(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function listProjects() {
  const result = await supabase.from(TABLE).select("*").order("code");
  return assertResult(result).map(fromDb);
}

export async function createProject(project) {
  const result = await supabase
    .from(TABLE)
    .insert(toDb(project))
    .select("*")
    .single();

  return fromDb(assertResult(result));
}

export async function updateProject(project) {
  const result = await supabase
    .from(TABLE)
    .update(toDb(project))
    .eq("id", project.id)
    .select("*")
    .single();

  return fromDb(assertResult(result));
}

export async function deleteProject(id) {
  const result = await supabase.from(TABLE).delete().eq("id", id);
  assertResult(result);
  return id;
}
