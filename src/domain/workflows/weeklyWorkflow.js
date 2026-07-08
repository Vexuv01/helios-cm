export const WEEKLY_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  VALIDATED: "VALIDATED",
  APPROVED: "APPROVED",
  LOCKED: "LOCKED",
};

const TRANSITIONS = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["VALIDATED", "DRAFT"],
  VALIDATED: ["APPROVED", "SUBMITTED"],
  APPROVED: ["LOCKED"],
  LOCKED: [],
};

export function canTransition(currentStatus, nextStatus) {
  return TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

export function nextWeeklyStatus(currentStatus) {
  switch (currentStatus) {
    case WEEKLY_STATUS.DRAFT:
      return WEEKLY_STATUS.SUBMITTED;

    case WEEKLY_STATUS.SUBMITTED:
      return WEEKLY_STATUS.VALIDATED;

    case WEEKLY_STATUS.VALIDATED:
      return WEEKLY_STATUS.APPROVED;

    case WEEKLY_STATUS.APPROVED:
      return WEEKLY_STATUS.LOCKED;

    default:
      return currentStatus;
  }
}

export function isWeeklyLocked(status) {
  return (
    status === WEEKLY_STATUS.APPROVED ||
    status === WEEKLY_STATUS.LOCKED
  );
}
