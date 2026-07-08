export function toNumber(value) {
  return Number(value || 0);
}

export function progress(activity) {
  const baseline = toNumber(activity?.baselineQuantity);

  if (baseline <= 0) {
    return 0;
  }

  return Math.min(
    (toNumber(activity?.installedQuantity) / baseline) * 100,
    100
  );
}

export function percent(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

export function remaining(activity) {
  return Math.max(
    toNumber(activity?.baselineQuantity) -
      toNumber(activity?.installedQuantity),
    0
  );
}
