import { supabase } from "../../../lib/supabaseClient";

function assertResult(result, fallbackMessage) {
  if (result.error) {
    throw new Error(
      result.error.message || fallbackMessage
    );
  }

  return result.data;
}

export async function listCashFlowEvents(projectId) {
  if (!projectId) return [];

  const result = await supabase
    .from("cash_flow_events")
    .select("*")
    .eq("project_id", projectId)
    .order("payment_date", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    assertResult(
      result,
      "Unable to load project Cash Flow events"
    ) || []
  );
}

export async function createCashFlowEvent(payload) {
  if (!payload?.projectId) {
    throw new Error("Project id is required");
  }

  if (!payload?.paymentDate) {
    throw new Error("Payment date is required");
  }

  const amount = Number(payload.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      "Cash Flow amount must be a non-negative number"
    );
  }

  const result = await supabase
    .from("cash_flow_events")
    .insert({
      project_id: payload.projectId,
      payment_date: payload.paymentDate,
      amount,
      category: payload.category || null,
      detail: payload.detail || null,
      description: payload.description || null,
      ordering_party: payload.orderingParty || null,
      recipient: payload.recipient || null,
      iban: payload.iban || null,
      notes: payload.notes || null,
      source_row_key: payload.sourceRowKey || null,
    })
    .select("*")
    .single();

  return assertResult(
    result,
    "Unable to create Cash Flow event"
  );
}

export async function updateCashFlowEvent(
  eventId,
  payload
) {
  if (!eventId) {
    throw new Error("Cash Flow event id is required");
  }

  const updatePayload = {
    updated_at: new Date().toISOString(),
  };

  if (payload.paymentDate !== undefined) {
    updatePayload.payment_date = payload.paymentDate;
  }

  if (payload.amount !== undefined) {
    const amount = Number(payload.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(
        "Cash Flow amount must be a non-negative number"
      );
    }

    updatePayload.amount = amount;
  }

  if (payload.category !== undefined) {
    updatePayload.category = payload.category || null;
  }

  if (payload.detail !== undefined) {
    updatePayload.detail = payload.detail || null;
  }

  if (payload.description !== undefined) {
    updatePayload.description =
      payload.description || null;
  }

  if (payload.orderingParty !== undefined) {
    updatePayload.ordering_party =
      payload.orderingParty || null;
  }

  if (payload.recipient !== undefined) {
    updatePayload.recipient = payload.recipient || null;
  }

  if (payload.iban !== undefined) {
    updatePayload.iban = payload.iban || null;
  }

  if (payload.notes !== undefined) {
    updatePayload.notes = payload.notes || null;
  }

  const result = await supabase
    .from("cash_flow_events")
    .update(updatePayload)
    .eq("id", eventId)
    .select("*")
    .single();

  return assertResult(
    result,
    "Unable to update Cash Flow event"
  );
}

export async function deleteCashFlowEvent(eventId) {
  if (!eventId) {
    throw new Error("Cash Flow event id is required");
  }

  const result = await supabase
    .from("cash_flow_events")
    .delete()
    .eq("id", eventId);

  assertResult(
    result,
    "Unable to delete Cash Flow event"
  );

  return true;
}

export async function replaceProjectCashFlowEvents(
  projectId,
  events
) {
  if (!projectId) {
    throw new Error("Project id is required");
  }

  if (!Array.isArray(events)) {
    throw new Error(
      "Cash Flow events must be an array"
    );
  }

  const deleteResult = await supabase
    .from("cash_flow_events")
    .delete()
    .eq("project_id", projectId);

  assertResult(
    deleteResult,
    "Unable to clear existing Cash Flow events"
  );

  if (events.length === 0) {
    return [];
  }

  const rows = events.map((event) => ({
    project_id: projectId,
    payment_date: event.paymentDate,
    amount: Number(event.amount) || 0,
    category: event.category || null,
    detail: event.detail || null,
    description: event.description || null,
    ordering_party: event.orderingParty || null,
    recipient: event.recipient || null,
    iban: event.iban || null,
    notes: event.notes || null,
    source_row_key: event.sourceRowKey || null,
  }));

  const insertResult = await supabase
    .from("cash_flow_events")
    .insert(rows)
    .select("*");

  return (
    assertResult(
      insertResult,
      "Unable to import Cash Flow events"
    ) || []
  );
}
