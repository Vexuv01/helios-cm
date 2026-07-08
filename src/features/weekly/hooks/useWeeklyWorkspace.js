import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../../projects/context/useProject";
import {
  getCurrentWeekRange,
  loadWeeklyWorkspace,
  saveWeeklyQuantity,
} from "../services/weeklyService";

function numberValue(value) {
  return Number(value || 0);
}

export function useWeeklyWorkspace() {
  const { currentProject, projectId } = useProject();
  const defaultWeek = getCurrentWeekRange();

  const [weekStart, setWeekStart] = useState(defaultWeek.weekStart);
  const [weekEnd, setWeekEnd] = useState(defaultWeek.weekEnd);
  const [workspace, setWorkspace] = useState(null);
  const [draftValues, setDraftValues] = useState({});
  const [draftNotes, setDraftNotes] = useState({});
  const [dirtyRows, setDirtyRows] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [savedRows, setSavedRows] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const autosaveTimer = useRef(null);

  const refreshWeekly = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await loadWeeklyWorkspace(projectId, weekStart, weekEnd);
      setWorkspace(data);

      const values = {};
      const notes = {};
      const initialExpanded = {};

      data.rows.forEach((row) => {
        values[row.activity.id] = row.quantityThisWeek;
        notes[row.activity.id] = row.notes || "";
        initialExpanded[row.activity.discipline || "GENERAL"] = true;
      });

      setDraftValues(values);
      setDraftNotes(notes);
      setDirtyRows({});
      setExpanded((current) => (Object.keys(current).length ? current : initialExpanded));
    } catch (err) {
      setError(err.message || "Unable to load Weekly");
    } finally {
      setLoading(false);
    }
  }, [projectId, weekStart, weekEnd]);

  useEffect(() => {
    refreshWeekly();
  }, [refreshWeekly]);

  const groupedRows = useMemo(() => {
    if (!workspace?.rows) return {};

    return workspace.rows.reduce((acc, row) => {
      const discipline = row.activity.discipline || "GENERAL";
      if (!acc[discipline]) acc[discipline] = [];
      acc[discipline].push(row);
      return acc;
    }, {});
  }, [workspace]);

  const totalThisWeek = Object.values(draftValues).reduce(
    (sum, value) => sum + numberValue(value),
    0
  );

  const activeRows = workspace?.rows?.filter(
    (row) =>
      numberValue(row.activity.baselineQuantity) > 0 ||
      numberValue(row.activity.installedQuantity) > 0 ||
      numberValue(draftValues[row.activity.id]) > 0
  );

  function markDirty(activityId) {
    setDirtyRows((current) => ({ ...current, [activityId]: true }));
  }

  function updateQuantity(activityId, value) {
    setDraftValues((current) => ({ ...current, [activityId]: value }));
    markDirty(activityId);
  }

  function updateNotes(activityId, value) {
    setDraftNotes((current) => ({ ...current, [activityId]: value }));
    markDirty(activityId);
  }

  function toggleDiscipline(discipline) {
    setExpanded((current) => ({
      ...current,
      [discipline]: !current[discipline],
    }));
  }

  useEffect(() => {
    if (!workspace?.report?.id) return;

    const dirtyIds = Object.keys(dirtyRows).filter((id) => dirtyRows[id]);
    if (dirtyIds.length === 0) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(async () => {
      const idsToSave = Object.keys(dirtyRows).filter((id) => dirtyRows[id]);
      if (idsToSave.length === 0) return;

      setSavingRows((current) => {
        const next = { ...current };
        idsToSave.forEach((id) => { next[id] = true; });
        return next;
      });

      setError("");

      try {
        await Promise.all(
          idsToSave.map((activityId) =>
            saveWeeklyQuantity({
              projectId,
              weeklyReportId: workspace.report.id,
              wbsActivityId: activityId,
              quantityThisWeek: numberValue(draftValues[activityId]),
              notes: draftNotes[activityId] || "",
            })
          )
        );

        setDirtyRows((current) => {
          const next = { ...current };
          idsToSave.forEach((id) => { delete next[id]; });
          return next;
        });

        setSavedRows((current) => {
          const next = { ...current };
          idsToSave.forEach((id) => { next[id] = true; });
          return next;
        });

        setTimeout(() => {
          setSavedRows((current) => {
            const next = { ...current };
            idsToSave.forEach((id) => { delete next[id]; });
            return next;
          });
        }, 1800);
      } catch (err) {
        setError(err.message || "Unable to autosave Weekly");
      } finally {
        setSavingRows((current) => {
          const next = { ...current };
          idsToSave.forEach((id) => { delete next[id]; });
          return next;
        });
      }
    }, 700);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [dirtyRows, draftValues, draftNotes, projectId, workspace?.report?.id]);

  return {
    currentProject,
    weekStart,
    setWeekStart,
    weekEnd,
    setWeekEnd,
    workspace,
    groupedRows,
    totalThisWeek,
    activeRows,
    draftValues,
    draftNotes,
    dirtyRows,
    savingRows,
    savedRows,
    expanded,
    loading,
    error,
    updateQuantity,
    updateNotes,
    toggleDiscipline,
  };
}
