export function validateWbsActivities(activities) {
  const errors = [];
  const codes = new Set();

  if (!activities.length) {
    errors.push("Nessuna attività valida trovata nel file Excel.");
  }

  activities.forEach((activity, index) => {
    const row = index + 2;
    const codeKey = String(activity.code || "").trim().toUpperCase();

    if (!activity.code) errors.push(`Riga ${row}: Code mancante.`);
    if (!activity.discipline) errors.push(`Riga ${row}: Discipline mancante.`);
    if (!activity.name) errors.push(`Riga ${row}: Activity mancante.`);
    if (!activity.unit) errors.push(`Riga ${row}: Unit mancante.`);
    if (Number(activity.baselineQuantity || 0) <= 0) {
      errors.push(`Riga ${row}: Baseline Qty deve essere maggiore di 0.`);
    }
    if (Number(activity.weightPercent || 0) <= 0) {
      errors.push(`Riga ${row}: Weight % deve essere maggiore di 0.`);
    }
    if (!activity.plannedStart) errors.push(`Riga ${row}: Planned Start mancante o non valido.`);
    if (!activity.plannedFinish) errors.push(`Riga ${row}: Planned Finish mancante o non valido.`);

    if (codes.has(codeKey)) {
      errors.push(`Riga ${row}: codice duplicato ${activity.code}.`);
    }

    codes.add(codeKey);
  });

  const totalWeight = activities.reduce(
    (sum, activity) => sum + Number(activity.weightPercent || 0),
    0
  );

  if (totalWeight <= 0) {
    errors.push("Peso totale WBS non valido: deve essere maggiore di 0.");
  }

  return {
    valid: errors.length === 0,
    errors,
    totalWeight,
    activitiesCount: activities.length,
  };
}
