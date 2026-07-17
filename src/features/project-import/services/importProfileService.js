import { defaultImportProfile } from "../profiles/defaultProfile.js";

const profiles = new Map();

export function getImportProfile(projectId) {
  return profiles.get(projectId) ?? null;
}

export function hasImportProfile(projectId) {
  return profiles.has(projectId);
}

export function saveImportProfile(projectId, profile) {
  profiles.set(projectId, {
    ...defaultImportProfile,
    ...profile,
  });

  return profiles.get(projectId);
}

export function removeImportProfile(projectId) {
  profiles.delete(projectId);
}
