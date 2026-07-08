function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildWbsWeightModel(rows = []) {
  const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
  const childrenByParent = rows.reduce((acc, row) => {
    const key = row.parent_id || "root";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

  function realWeight(row) {
    const localWeight = toNumber(row.weight_percent);

    if (!row.parent_id) {
      return localWeight;
    }

    const parent = byId[row.parent_id];

    if (!parent) {
      return localWeight;
    }

    return (realWeight(parent) * localWeight) / 100;
  }

  function level(row) {
    if (!row.parent_id) return 1;
    const parent = byId[row.parent_id];
    if (!parent) return 1;
    return level(parent) + 1;
  }

  function isLeaf(row) {
    return !childrenByParent[row.id]?.length;
  }

  function parentLabel(row) {
    if (!row.parent_id) return "Root";
    const parent = byId[row.parent_id];
    return parent ? `${parent.code} · ${parent.name}` : "Root";
  }

  const enriched = rows.map((row) => ({
    ...row,
    level: level(row),
    is_leaf: isLeaf(row),
    parent_label: parentLabel(row),
    real_weight_percent: Number(realWeight(row).toFixed(4)),
  }));

  const validation = Object.entries(childrenByParent).map(([parentId, children]) => {
    const total = children.reduce((sum, child) => sum + toNumber(child.weight_percent), 0);
    const parent = parentId === "root" ? null : byId[parentId];

    return {
      parentId,
      label: parent ? `${parent.code} · ${parent.name}` : "Root categories",
      total: Number(total.toFixed(2)),
      ok: Math.abs(total - 100) < 0.01,
    };
  });

  return {
    rows: enriched,
    validation,
  };
}
