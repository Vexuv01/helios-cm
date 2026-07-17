function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value) {
  return Number(numberValue(value).toFixed(2));
}

function isoDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function monthKey(value) {
  const date = isoDate(value);

  return date ? date.slice(0, 7) : "";
}

function monthLabel(key) {
  if (!key) return "";

  const [year, month] = key.split("-").map(Number);

  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function mapEvent(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    paymentDate: isoDate(row.payment_date),
    amount: roundCurrency(row.amount),
    category: row.category || "",
    detail: row.detail || "",
    description: row.description || "",
    orderingParty: row.ordering_party || "",
    recipient: row.recipient || "",
    iban: row.iban || "",
    notes: row.notes || "",
    sourceRowKey: row.source_row_key || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function buildMonthlySeries(events) {
  const totals = new Map();

  events.forEach((event) => {
    const key = monthKey(event.paymentDate);

    if (!key) return;

    totals.set(
      key,
      roundCurrency(
        numberValue(totals.get(key)) +
          numberValue(event.amount)
      )
    );
  });

  return [...totals.entries()]
    .sort(([left], [right]) =>
      left.localeCompare(right)
    )
    .map(([key, amount]) => ({
      key,
      month: monthLabel(key),
      amount,
    }));
}

function findNextPayment(events, today) {
  const todayIso = isoDate(today);

  return (
    events.find(
      (event) =>
        event.paymentDate &&
        event.paymentDate >= todayIso
    ) || null
  );
}

export function buildCashFlowSnapshot(
  rows,
  options = {}
) {
  const today =
    options.today ||
    new Date().toISOString().slice(0, 10);

  const events = (Array.isArray(rows) ? rows : [])
    .map(mapEvent)
    .filter(
      (event) =>
        event.paymentDate &&
        event.amount >= 0
    )
    .sort((left, right) =>
      left.paymentDate.localeCompare(
        right.paymentDate
      )
    );

  const total = roundCurrency(
    events.reduce(
      (sum, event) => sum + event.amount,
      0
    )
  );

  const largestPayment =
    events.reduce(
      (largest, event) =>
        event.amount > largest.amount
          ? event
          : largest,
      {
        id: "",
        amount: 0,
        paymentDate: "",
        description: "",
        recipient: "",
      }
    );

  const nextPayment = findNextPayment(
    events,
    today
  );

  return {
    total,
    largestPayment,
    nextPayment,
    eventCount: events.length,
    monthly: buildMonthlySeries(events),
    events,
  };
}
