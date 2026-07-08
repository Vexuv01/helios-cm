function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOperationalActivity(row) {
  return row.code?.includes(".") || row.parent_id;
}

export function buildWbsWeightModel(rows = []) {
  const operativeRows = rows.filter(isOperationalActivity);

  const enriched = rows.map((row) => ({
    ...row,
    is_leaf: isOperationalActivity(row),
    real_weight_percent: isOperationalActivity(row)
      ? Number(toNumber(row.weight_percent).toFixed(4))
      : 0,
  }));

  const totalWeight = operativeRows.reduce(
    (sum, row) => sum + toNumber(row.weight_percent),
    0
  );

  const validation = [
    {
      parentId: "project",
      label: "Project total weight",
      total: Number(totalWeight.toFixed(2)),
      ok: Math.abs(totalWeight - 100) < 0.01,
    },
  ];

  return {
    rows: enriched,
    validation,
  };
}
