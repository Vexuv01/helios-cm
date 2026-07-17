import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import {
  exportWeeklyExcel,
  importWeeklyExcel,
} from "../excel/weeklyExcelService";
import {
  isWeeklyProductionLocked,
  loadProjectWeeklyProduction,
  removeProjectWeekly,
  saveProjectWeeklyProduction,
  toWeeklyNumber,
  unlockProjectWeekly,
} from "../services/projectWeeklyService";

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function mondayOf(value = new Date()) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);

  const day = date.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + difference);
  return date;
}

function weekFromMonday(mondayIso) {
  const monday = mondayOf(`${mondayIso}T12:00:00`);
  const friday = new Date(monday);

  friday.setDate(monday.getDate() + 4);

  return {
    weekStart: iso(monday),
    weekEnd: iso(friday),
  };
}

export function shiftMonday(mondayIso, weeks) {
  const date = mondayOf(`${mondayIso}T12:00:00`);

  date.setDate(date.getDate() + weeks * 7);
  return iso(date);
}

export function toWeeklyDisplayNumber(value) {
  return toWeeklyNumber(value);
}

export function calculateWeeklyProgress(actual, baseline) {
  const normalizedBaseline = toWeeklyNumber(baseline);

  if (normalizedBaseline <= 0) return 0;

  return Math.min(
    (toWeeklyNumber(actual) / normalizedBaseline) * 100,
    100
  );
}

export function useProjectWeeklyPage() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;

  const [weekStart, setWeekStart] = useState(() =>
    iso(mondayOf())
  );

  const week = useMemo(
    () => weekFromMonday(weekStart),
    [weekStart]
  );

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(
    routeProjectId || ""
  );
  const [reports, setReports] = useState([]);
  const [report, setReport] = useState(null);
  const [activities, setActivities] = useState([]);
  const [weeklyValues, setWeeklyValues] = useState({});
  const [cumulativeValues, setCumulativeValues] = useState({});
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);

  const weeklyExcelInputRef = useRef(null);

  const locked = isWeeklyProductionLocked(report?.status);

  const operationalActivities = useMemo(
    () =>
      activities.filter(
        (activity) => activity.is_group !== true
      ),
    [activities]
  );

  const disciplines = useMemo(
    () => [
      ...new Set(
        operationalActivities
          .map((activity) => activity.discipline)
          .filter(Boolean)
      ),
    ],
    [operationalActivities]
  );

  const visibleActivities = useMemo(() => {
    const term = search.toLowerCase();

    return operationalActivities.filter((activity) => {
      const matchesSearch =
        !search ||
        String(activity.code || "")
          .toLowerCase()
          .includes(term) ||
        String(activity.name || "")
          .toLowerCase()
          .includes(term);

      const matchesDiscipline =
        discipline === "all" ||
        activity.discipline === discipline;

      return matchesSearch && matchesDiscipline;
    });
  }, [discipline, operationalActivities, search]);

  const weeklyTotal = useMemo(
    () =>
      Object.values(weeklyValues).reduce(
        (sum, value) => sum + toWeeklyNumber(value),
        0
      ),
    [weeklyValues]
  );

  const activeRows = useMemo(
    () =>
      Object.values(weeklyValues).filter(
        (value) => toWeeklyNumber(value) !== 0
      ).length,
    [weeklyValues]
  );

  const loadWeekly = useCallback(async () => {
    setLoading(true);

    try {
      const data = await loadProjectWeeklyProduction({
        requestedProjectId: projectId,
        routeProjectId,
        weekStart: week.weekStart,
      });

      setProjects(data.projects);

      if (data.projectId !== projectId) {
        setProjectId(data.projectId);
      }

      setReports(data.reports);
      setReport(data.report);
      setActivities(data.activities);
      setWeeklyValues(data.weeklyValues);
      setCumulativeValues(data.cumulativeValues);
    } catch (error) {
      window.alert(
        error.message || "Errore caricamento Weekly"
      );

      setReports([]);
      setReport(null);
      setActivities([]);
      setWeeklyValues({});
      setCumulativeValues({});
    } finally {
      setLoading(false);
    }
  }, [
    projectId,
    routeProjectId,
    week.weekStart,
  ]);

  useEffect(() => {
    loadWeekly();
  }, [loadWeekly]);

  async function saveWeekly(nextStatus = "DRAFT") {
    if (locked) {
      window.alert(
        "Questa Weekly è già stata inviata o approvata e non è modificabile."
      );
      return;
    }

    setSaving(true);

    try {
      await saveProjectWeeklyProduction({
        projectId,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        status: nextStatus,
        weeklyValues,
      });

      await loadWeekly();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function unlockWeekly() {
    if (!report?.id) return;

    const confirmed = window.confirm(
      "Admin override: vuoi riaprire questa Weekly e riportarla in DRAFT?"
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await unlockProjectWeekly(report.id);
      await loadWeekly();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentWeekly() {
    if (!report?.id) {
      window.alert(
        "Nessuna Weekly da eliminare per questa settimana."
      );
      return;
    }

    const confirmed = window.confirm(
      `Eliminare definitivamente la Weekly ${week.weekStart} / ${week.weekEnd}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await removeProjectWeekly(report.id);

      setReport(null);
      setWeeklyValues({});
      setCumulativeValues({});

      await loadWeekly();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitWeekly() {
    if (weeklyTotal <= 0) {
      window.alert(
        "Inserisci almeno una quantità prima del submit."
      );
      return;
    }

    const confirmed = window.confirm(
      "Confermi il submit della Weekly? Dopo il submit non sarà più modificabile dall'EPC."
    );

    if (!confirmed) return;

    await saveWeekly("SUBMITTED");
  }

  async function handleExportWeeklyExcel() {
    const selectedProject = projects.find(
      (project) => project.id === projectId
    );

    try {
      await exportWeeklyExcel({
        project: selectedProject,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        activities: operationalActivities,
        cumulativeValues,
        weeklyValues,
      });
    } catch (error) {
      window.alert(
        error.message ||
          "Errore durante l'export Weekly Excel."
      );
    }
  }

  async function handleImportWeeklyExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (locked) {
      window.alert(
        "La Weekly è bloccata. Esegui Admin Unlock prima di importare."
      );
      return;
    }

    setImportingExcel(true);

    try {
      const result = await importWeeklyExcel(
        file,
        operationalActivities
      );

      setWeeklyValues((current) => ({
        ...current,
        ...result.values,
      }));

      const warnings = [];

      if (result.unknownCodes.length) {
        warnings.push(
          `Codici non trovati: ${result.unknownCodes.join(", ")}`
        );
      }

      if (result.duplicateCodes.length) {
        warnings.push(
          `Codici duplicati ignorati: ${result.duplicateCodes.join(", ")}`
        );
      }

      window.alert(
        [
          `Import completato: ${result.importedRows} attività aggiornate.`,
          "I valori sono in bozza: premi Save Draft per salvarli.",
          ...warnings,
        ].join("\n")
      );
    } catch (error) {
      window.alert(
        error.message ||
          "Errore durante l'import Weekly Excel."
      );
    } finally {
      setImportingExcel(false);
    }
  }

  return {
    weekStart,
    setWeekStart,
    week,
    projects,
    projectId,
    setProjectId,
    reports,
    report,
    weeklyValues,
    setWeeklyValues,
    cumulativeValues,
    search,
    setSearch,
    discipline,
    setDiscipline,
    loading,
    saving,
    importingExcel,
    weeklyExcelInputRef,
    locked,
    operationalActivities,
    disciplines,
    visibleActivities,
    weeklyTotal,
    activeRows,
    saveWeekly,
    submitWeekly,
    unlockWeekly,
    deleteCurrentWeekly,
    handleExportWeeklyExcel,
    handleImportWeeklyExcel,
  };
}
