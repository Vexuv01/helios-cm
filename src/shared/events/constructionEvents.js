export const CONSTRUCTION_EVENTS = {
  ACTIVITY_CHANGED: "helios:activity-changed",
  SNAPSHOT_INVALIDATED: "helios:snapshot-invalidated",
};

export function emitConstructionEvent(type, detail = {}) {
  window.dispatchEvent(
    new CustomEvent(type, {
      detail: {
        ...detail,
        emittedAt: new Date().toISOString(),
      },
    })
  );
}

export function onConstructionEvent(type, handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(type, listener);

  return () => {
    window.removeEventListener(type, listener);
  };
}
