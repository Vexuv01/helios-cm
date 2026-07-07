import { supabase } from "../lib/supabaseClient";
import { normalizeProject } from "../domain/project/project.model";

function mapProject(row) {
  return normalizeProject({
    id: row.id,
    code: row.code,
    name: row.name,
    developmentPartner: row.development_partner,
    developmentContract: row.development_contract,
    municipality: row.municipality,
    province: row.province,
    region: row.region,
    totalPowerMwDc: row.total_power_mw_dc,
    pvPowerMwDc: row.pv_power_mw_dc,
    pvPowerMwAc: row.pv_power_mw_ac,
    status: row.status,
    priority: row.priority,
  });
}

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapProject);
}
