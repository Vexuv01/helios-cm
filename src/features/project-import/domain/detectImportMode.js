export const IMPORT_MODE = {
  INITIAL_IMPORT: "INITIAL_IMPORT",
  WEEKLY_UPDATE: "WEEKLY_UPDATE",
};

export function detectImportMode({ activitiesCount = 0 }) {
  return activitiesCount === 0
    ? IMPORT_MODE.INITIAL_IMPORT
    : IMPORT_MODE.WEEKLY_UPDATE;
}
