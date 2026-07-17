import { buildCashFlowSnapshot } from "../domain/cashFlowEngine";
import { listCashFlowEvents } from "../repositories/cashFlowRepository";

export async function loadProjectCashFlowSnapshot(projectId) {
  if (!projectId) {
    return buildCashFlowSnapshot([]);
  }

  const rows = await listCashFlowEvents(projectId);

  return buildCashFlowSnapshot(rows);
}
